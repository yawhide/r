// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {ipcRenderer} = require('electron')



ipcRenderer.on('ticker-info', (event, data) => {
  console.log(data) // prints "pong"f
  let $list = document.querySelector('.list')
  let $listInner = document.querySelector('.list > div')
  $list.removeChild($listInner)
  $list.appendChild(document.createElement('div'))
  $listInner = document.querySelector('.list > div')

  data.forEach((arg) => {
    let elem = document.createElement('div')
    elem.dataset.ticker = arg.symbol;
    let newContent = document.createTextNode(`${arg.symbol} $${arg.last_trade_price}`);
    elem.appendChild(newContent);
    elem.onclick = (e) => {
      ipcRenderer.send('remove-ticker', e.target.dataset.ticker)
      let elmt = e.target;
      elmt.parentNode.removeChild(elmt);
    }
    $listInner.appendChild(elem);
  })
})

let stocksToCheck = []
try {
  stocksToCheck = JSON.parse(localStorage.getItem('tickers'))
} catch(e) {

}

const $form = document.querySelector('form')
$form.onsubmit = (e) => {
  e.preventDefault()
  ipcRenderer.send('new-ticker', e.target.children[0].value)
  e.target.children[0].value = '';
}

