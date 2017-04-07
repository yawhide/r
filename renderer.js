// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const {ipcRenderer} = require('electron')



ipcRenderer.on('ticker-info', (event, data) => {
  // console.log(data) // prints "pong"f
  let $list = document.querySelector('.list')
  let $listInner = document.querySelector('.list > div')
  $list.removeChild($listInner)
  $list.appendChild(document.createElement('div'))
  $listInner = document.querySelector('.list > div')

  data.forEach((arg) => {
    //{
      //    body.results: [
      //        {
      //            ask_price: String, // Float number in a String, e.g. '735.7800'
      //            ask_size: Number, // Integer
      //            bid_price: String, // Float number in a String, e.g. '731.5000'
      //            bid_size: Number, // Integer
      //            last_trade_price: String, // Float number in a String, e.g. '726.3900'
      //            last_extended_hours_trade_price: String, // Float number in a String, e.g. '735.7500'
      //            previous_close: String, // Float number in a String, e.g. '743.6200'
      //            adjusted_previous_close: String, // Float number in a String, e.g. '743.6200'
      //            previous_close_date: String, // YYYY-MM-DD e.g. '2016-01-06'
      //            symbol: String, // e.g. 'AAPL'
      //            trading_halted: Boolean,
      //            updated_at: String, // YYYY-MM-DDTHH:MM:SS e.g. '2016-01-07T21:00:00Z'
      //        }
      //    ]
      //}
    let elem = document.createElement('div')
    elem.dataset.ticker = arg.symbol;
    console.log(arg.result.last_trade_price, arg.result.previous_close)
    let lastTradePrice = Number(arg.result.last_trade_price);
    let prevClose = Number(arg.result.previous_close);
    let dir, diff;
    if (lastTradePrice > prevClose) {
      dir = '+';
      diff = +(((lastTradePrice/prevClose)-1)*100).toFixed(2);
    } else {
      dir = '-';
      diff = +((1-(lastTradePrice/prevClose))*100).toFixed(2);
    }
    let newContent = document.createTextNode(`${arg.symbol}     $${arg.last_trade_price}     ${dir}${diff}%`);
    elem.appendChild(newContent);
    elem.onclick = (e) => {
      ipcRenderer.send('remove-ticker', e.target.dataset.ticker)
      let elmt = e.target;
      elmt.parentNode.removeChild(elmt);
    }
    $listInner.appendChild(elem);
    if (arg.notify) {
      let myNotification = new Notification(arg.symbol, {
        body: `${arg.symbol} reached ${arg.last_trade_price}. ${arg.dir} $${Math.abs(+(arg.notifPrice - arg.last_trade_price).toFixed(2))}`
      })
      myNotification.onclick = () => {
        ipcRenderer.send('remove-notif', arg.symbol)
      }
    }
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
  ipcRenderer.send('new-ticker', { ticker: e.target.children[0].value, notifPrice: e.target.children[1].value })
  e.target.children[0].value = '';
  e.target.children[1].value = '';
}

