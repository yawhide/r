const {ipcRenderer} = require('electron')
const {render} = require('nunjucks')



ipcRenderer.on('ticker-info', (event, data) => {
  let $list = document.querySelector('.list')
  let $listInner = document.querySelector('.list > div')
  $list.removeChild($listInner)
  $list.appendChild(document.createElement('div'))
  $listInner = document.querySelector('.list > div')
  const items = []

  data.sort((a, b) => a.symbol.localeCompare(b.symbol)).forEach((arg) => {
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

    const now = new Date();
    const openHours = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30);
    const closeHours = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16);

    let lastTradePrice = now > openHours && now < closeHours ? Number(arg.result.last_trade_price) : Number(arg.result.last_extended_hours_trade_price);
    let prevClose = Number(arg.result.previous_close);
    let dir, diff;
    if (lastTradePrice >= prevClose) {
      dir = '';
      diff = +(((lastTradePrice/prevClose)-1)*100).toFixed(2);
    } else {
      dir = '-';
      diff = +((1-(lastTradePrice/prevClose))*100).toFixed(2);
    }
    items.push({
      symbol: arg.symbol,
      last_trade_price: lastTradePrice,
      dir,
      diff: `${dir} ${diff}`,
      // last_extended_hours_trade_price: arg.last_extended_hours_trade_price,
    })
  });

  const table = render('main.html', { items })
  $listInner.innerHTML = table;

  const $buttons = document.querySelectorAll('button');
  for (let i = 0; i < $buttons.length; i++) {
    $buttons[i].onclick = (e) => {
      ipcRenderer.send('remove-ticker', e.target.dataset.ticker);
    };
  }
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

