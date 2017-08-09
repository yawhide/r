const electron = require('electron')
const async = require('async');
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const creds = require('./config.json')
const {ipcMain} = require('electron')
const JsonDB = require('@diam/json-db')
const fs = require('fs')
const tickerDbPath = './tickers.json'

if (!fs.existsSync(tickerDbPath)) fs.writeFileSync(tickerDbPath, JSON.stringify({}))
let db = new JsonDB(tickerDbPath)
let stocksToCheck = db.readSync()
console.info('tickers to start watching:', stocksToCheck)

ipcMain.on('new-ticker', (event, arg) => {
  console.log('new-ticker:', arg)  // prints "ping"
  let ticker = arg.ticker.toLowerCase()
  let notifPrice = Number(arg.notifPrice)
  let stc = Object.keys(stocksToCheck)
  if (!stocksToCheck[ticker]) stc.push(ticker)
  getPrices(stc, (err, body) => {
    if (err) return
    body.results.forEach(result => {
      console.log(result.symbol, result.last_trade_price)
      if (result.symbol.toLowerCase() === ticker) {
        stocksToCheck[ticker] = {}
        if (notifPrice) {
          stocksToCheck[ticker].notifPrice = notifPrice
          stocksToCheck[ticker].direction = Number(result.last_trade_price) > notifPrice ? 'down' : 'up'
          console.log('tracking:', ticker, stocksToCheck[ticker].direction)
        }
      }
    })
    db.writeSync(stocksToCheck)
    sendUpdatedStockInfo(body)
  })
})

ipcMain.on('remove-ticker', (event, arg) => {
  console.log('remove-ticker', arg)  // prints "ping"
  delete stocksToCheck[arg.toLowerCase()]
  db.writeSync(stocksToCheck)
})

ipcMain.on('remove-notif', (event, arg) => {
  stocksToCheck[arg.toLowerCase()] = {}
  db.writeSync(stocksToCheck)
})

// ipcMain.on('track', (event, arg) => {

//   getPrices(arg.ticker, (err, body) => {
//     body.results
//     mainWindow.webContents.send('ticker-info', { ticker: , price: , })
//   })
// })

const Robinhood = require('robinhood')(creds, () => {
  console.info('robinhood is ready')
  console.log('stocksToCheck:', stocksToCheck)
  Robinhood.nonzero_positions(function(err, resp, body){
    if (err){
        console.erro(err);
    }else{
      // console.log("positions");
      // console.log(body);

      async.eachLimit(body.results, 1, (result, cb) => {
        Robinhood.url(result.instrument, (err, resp, body) => {
          console.log(result.average_buy_price, result.quantity, result.updated_at, body.symbol);
          // console.log(body)
          cb()
        })
      })
    }
  });


  updateStocks()
  setInterval(() => {
    updateStocks()
  }, 10000)
});

function updateStocks() {
  let stc = Object.keys(stocksToCheck)
  if (!stc.length) return
  getPrices(stc, (err, body) => {
    if (err) return
    sendUpdatedStockInfo(body)
  })
}

function sendUpdatedStockInfo(body) {
  let info = []
  body.results.forEach((result) => {
    let ticker = result.symbol.toLowerCase()
    let lastTradePrice = Number(result.last_trade_price)
    if (!stocksToCheck[ticker]) return;
    let dir = stocksToCheck[ticker].direction
    let notifPrice = stocksToCheck[ticker].notifPrice
    // console.log(result)
    let tickerInfo = {
      dir,
      last_extended_hours_trade_price: Number(result.last_extended_hours_trade_price),
      last_trade_price: Number(lastTradePrice),
      notifPrice,
      symbol: result.symbol,
      result,
    }
    // console.log(lastTradePrice <= notifPrice, lastTradePrice, notifPrice)
    if (dir) {
      if ((dir === 'up' && lastTradePrice >= notifPrice) ||
        (dir  === 'down' && lastTradePrice <= notifPrice)) {
        tickerInfo.notify = true
        console.log('notifying:', ticker, dir)
      }
    }
    info.push(tickerInfo)
  })
  // console.log(info)
  mainWindow.webContents.send('ticker-info', info)
}

function getPrices(tickers, cb) {
  if (typeof tickers === 'string') tickers = [tickers]
  Robinhood.quote_data(tickers, (err, response, body) => {
    if(err){
      console.error(`failed to get tickers: ${tickers}.`, err)
      return cb(err);
    }
    if (!body) {
      console.error(`Failed to get tickers: ${tickers}, no body...`)
      return cb({ message: 'no body'})
    }
    cb(null, body)
  })
}
