import React, { Component } from "react"
import * as blockstack from "blockstack"
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride"
import DatePicker from "react-datepicker"
import { Form } from "react-bootstrap"
import { LineChart } from "react-chartkick"

import "react-datepicker/dist/react-datepicker.css"
import logo from "./../assets/fit_logo.png"
import "chart.js"

const GET_OPTIONS = {
  decrypt: true
}

const PUT_OPTIONS = {
  encrypt: true
}

export default class FitstackProfile extends Component {
  state = {
    weightLogs: [],
    loading: true,
    run: false,
    inputDate: '',
    inputUnits: 'lb',
    inputWeight: '',
    stepIndex: 0, // a controlled tour
    steps: [
      {
        target: ".dash-header-text",
        content:
          "Welcome to the Fitness Stack weight tracker! This app allows you to securely track and share your weight loss achievements with friends."
      },
      {
        target: ".dash-entry",
        content: "New weight logs can be added from the bottom input here."
      },
      {
        target: ".dash-add",
        content:
          "Adding an entry appends it to your existing ledger, managed by Blockstack's decentralized and permissioned network."
      },
      {
        target: ".dash-delete",
        content:
          "Deleting the table is irreversible and remove all entries from your ledger. Only use this if you are certain you want to start over!"
      },
      {
        target: ".dash-chart",
        content:
          "We'll automatically plot your data over time as you add weight entries."
      },
      {
        target: ".dash-logout",
        content:
          "Logging out won't remove your data. It'll be saved so your can see it, save it, or make a new entry, the next time you visit!"
      }
    ],
  }

  constructor(props) {
    super(props)
    this.handleChange = this.handleChange.bind(this)
    this.handleDateChange = this.handleDateChange.bind(this)
    this.saveWeight = this.saveWeight.bind(this)
    this.deleteList = this.deleteList.bind(this)
  }

  componentDidMount() {
    this.listWeight()
  }

  getLogFile = () => 'logs.json'

  handleDateChange(inputDate) {
    this.setState({inputDate})
  }

  listWeight() {
    const self = this
    const { userSession, profile } = this.props
    let person = new blockstack.Person(profile)
    console.log("profile", person)

    userSession.getFile(self.getLogFile(), GET_OPTIONS).then(fileContents => {
      const weightLogs = JSON.parse(fileContents || "[]")
      console.log("fileContents of listWeight", fileContents)
      console.log("weights in listWeight", weightLogs)
      // set the tutorial to run if no logs are present.
      self.setState({ weightLogs, loading: false, run: weightLogs.length === 0 })
    })
  }

  saveWeight(event) {
    event.preventDefault()
    const self = this
    const { userSession } = this.props
    let { inputDate, inputWeight, inputUnits } = this.state
    console.log(this.state)
    if (!inputDate || !inputWeight || !inputUnits) {
      alert('Weight, date, and units must all be specified to save record.')
      return
    }

    inputWeight = parseInt(inputWeight)

    if (isNaN(inputWeight) || inputWeight <= 0) {
      alert('Input weight must be positive')
      return
    }

    userSession.getFile(self.getLogFile(), GET_OPTIONS).then(fileContents => {
        // get the contents of the file /weights.txt
        const weights = JSON.parse(fileContents || "[]")
        console.log("old weights in saveWeight", weights)
        const weightLogs = [
          ...weights,
          {
            weight: inputWeight,
            date: inputDate,
            units: inputUnits
          }
        ]
        console.log("weight to be saved", weightLogs)
        userSession.putFile(self.getLogFile(), JSON.stringify(weightLogs), PUT_OPTIONS).then(() => {
          self.setState({weightLogs})
          self.clearInputs()
        })
      })
  }

  clearInputs() {
    this.setState({
      inputDate: '',
      inputWeight: '',
      inputUnits: 'lb'
    })
  }

  deleteList(event) {
    const { userSession } = this.props
    event.preventDefault()
    userSession.deleteFile(this.getLogFile()).then(() => {
      this.listWeight()
    })
  }

  handleChange = e => {
    this.setState({ [e.target.name]: e.target.value })
  }

  deleteLastItem() {
    const { userSession } = this.props
    const self = this
    userSession.getFile(self.getLogFile(), GET_OPTIONS).then(fileContents => {
      const weights = JSON.parse(fileContents || "[]")
      if (weights.length > 1) {
        weights.pop()
        console.log("after deleting last item", weights)

        userSession.putFile(self.getLogFile(), JSON.stringify(weights), PUT_OPTIONS).then(() => {
          self.listWeight(userSession)
        })
      } else if (weights.length === 1) {
        document.getElementById("weights").style.display = "none"
        document.getElementById("weight-body").innerHTML = ""
        userSession.putFile(self.getLogFile(), [], { decrypt: false }).then(() => {
          self.listWeight(userSession)
        })
      }
    })
  }

  handleJoyrideCallback = data => {
    const { action, index, status, type } = data

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // Update state to advance the tour
      this.setState({ stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) })
    } else if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      // Need to set our running state to false, so we can restart if we click start again.
      this.setState({ run: false })
    }

    console.groupCollapsed(type)
    console.log(data) //eslint-disable-line no-console
    console.groupEnd()
  }

  render() {
    const { profile } = this.props
    let { weightLogs, run, stepIndex, inputDate, inputWeight, inputUnits, steps } = this.state
    weightLogs = weightLogs.map(log => {
      log.date = (new Date(log.date)).toISOString().split('T')[0]
      return log
    })

    let data = []
    let units = ""
    if (weightLogs && weightLogs.length > 0) {
      let points = []
      let max = 0

      units = weightLogs[0]["units"]

      weightLogs.forEach(log => {
        let w = log.weight
        const d = log.date
        const u = log.units
        if (u != units) {
          if (u === 'kg') {
            w *= 2.2
          } else if (u === 'lb') {
            w /= 2.2 
          }
        }
        w = parseInt(w)
        if (w && d) {
          points.push([d, w])
          max = Math.max(max, w)
        }
      })



      data = {
        name: `Weight (${units})`,
        data: points,
        max: max
      }
    }

    return (
      <div>
        <Joyride
          callback={this.handleJoyrideCallback}
          continuous={true}
          getHelpers={this.getHelpers}
          run={run}
          scrollToFirstStep={true}
          showProgress={true}
          showSkipButton={true}
          stepIndex={stepIndex}
          steps={steps}
          styles={{
            options: {
              zIndex: 10000
            }
          }}
        />
        <div id="crypto-container">
          <div className="panel-landing" id="crypto">
            <div className="dash-header">
              <img className="dash-logo" src={logo} />
              <span className="dash-header-text">Weight Tracker</span>
            </div>
            <div className="dash-chart">
              <LineChart
                legend={false}
                min={0}
                max={data['max']}
                data={data['data']}
                messages={{ empty: "Enter your first data point below!" }}
                ytitle={units}
                xtitle="Date"
              />
            </div>

            {/* Show existing data if present */}
            {weightLogs && weightLogs.length > 0 && (
              <div id="weights">
                <table className="table dash-table">
                  <thead className="thead-dark">
                    <tr>
                      <th>Weight</th>
                      <th>Date</th>
                      <th>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weightLogs.map((row, i) => {
                      return <tr key={i}>
                        <td>{row.weight}</td>
                        <td>{row.date}</td>
                        <td>{row.units}</td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <hr />

            <p className="dash-add-prompt">-<br/>Add a new weight recording:</p>
            <table className="weight-table dash-entry">
              <tbody id="weight-body">
                <tr>
                  <td>
                    <div className="input-group mb-3">
                    <Form.Control 
                      value={inputWeight}
                      onChange={this.handleChange} 
                      name='inputWeight' 
                      type="number" 
                      placeholder="Enter weight" 
                    />
                    </div>
                  </td>
                  <td>
                    <div className="input-group mb-3">
                      <DatePicker
                        className="date-picker"
                        placeholderText="Enter date"
                        selected={inputDate}
                        onChange={this.handleDateChange}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="input-group input-units-group mb-3">
                      <Form.Group controlId="exampleForm.ControlSelect1">
                        <Form.Control
                          as="select"
                          name="inputUnits"
                          value={inputUnits}
                          componentClass="select"
                          onChange={this.handleChange}>
                          <option>lb</option>
                          <option>kg</option>
                        </Form.Control>
                      </Form.Group>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            
          </div>
        </div>
        <div id="deleteWeights">
          <div className="btn btn-primary dash-add" id="save-weight" onClick={this.saveWeight}>
            Add weight log
          </div>
          &nbsp;
          <div className="btn btn-primary dash-delete" id="delete-button" onClick={this.deleteList}>
            Delete all
          </div>
        </div>
      </div>
    )
  }
}
