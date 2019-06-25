document.addEventListener("DOMContentLoaded", event => {
  const appConfig = new blockstack.AppConfig()
  const userSession = new blockstack.UserSession({ appConfig: appConfig })

  document.getElementById('signin-button').addEventListener('click', event => {
    event.preventDefault()
    userSession.redirectToSignIn()
  })

  document.getElementById('signout-button').addEventListener('click', event => {
    event.preventDefault()
    userSession.signUserOut()
    window.location = window.location.origin
  })

  document.getElementById('save-expense').addEventListener('click', event => {
    event.preventDefault()
    saveExpense(userSession);
  })

  function showProfile (profile) {
    let person = new blockstack.Person(profile);
    console.log('person', person);
    document.getElementById('heading-name').innerHTML = person.name() ? person.name() : "there";
    if(person.avatarUrl()) {
      document.getElementById('avatar-image').setAttribute('src', person.avatarUrl())
    }
    document.getElementById('section-1').style.display = 'none'
    document.getElementById('section-2').style.display = 'block'
  }

  function listExpense (userSession) {
    document.getElementById('crypto').style.display = 'block';
    console.log('userSession', userSession);
    let options = {
      decrypt: false
    }

    userSession.getFile("/expenses.json", options)
    .then((fileContents) => {
        // get the contents of the file /expenses.txt
        var todos = JSON.parse(fileContents || '[]');
        console.log('fileContents listExpense', fileContents);
        console.log('todos listExpense', todos);
        // document.getElementById('expenses').innerHTML = fileContents ? fileContents : '';
    });
  }

  function saveExpense(userSession) {
    let options = {
      encrypt: false
    }
    userSession.getFile("/expenses.json", {
      decrypt: false
    })
    .then((fileContents) => {
        // get the contents of the file /expenses.txt
        console.log('getExpenses', fileContents);
        var todos = JSON.parse(fileContents || '[]');
        console.log('todaos in saveExpense', todos);
        // const prevExpenses = fileContents ? fileContents : '' ;
        const category = document.getElementById('expense-category').value;
        const expenseAmount = document.getElementById('expense-amount').value;
        const expense = { 
          category,
          expenseAmount,
        };
        // console.log('prev expenses', prevExpenses);
        console.log('category input', category);
        console.log('amt input', expenseAmount);
        console.log('expense input', expense);
        userSession.putFile("/expenses.json", JSON.stringify(expense) , options)
        .then(() => {
            listExpense(userSession);
            // /expenses.txt exists now, and has the contents "hello world!".
        })
    });

  }

  if (userSession.isUserSignedIn()) {
    const profile = userSession.loadUserData().profile;
    console.log('profile test3: ', profile);
    showProfile(profile);
    listExpense(userSession);
  } else if (userSession.isSignInPending()) {
    userSession.handlePendingSignIn().then(userData => {
      window.location = window.location.origin
    })
  }
})


