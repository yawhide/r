const electron = require('electron')
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

console.log(JsonDB)

if (!fs.existsSync(tickerDbPath)) fs.writeFileSync(tickerDbPath, JSON.stringify({}))
let db = new JsonDB(tickerDbPath)
let stocksToCheck = db.readSync()
console.info('tickers to start watching:', stocksToCheck)

ipcMain.on('new-ticker', (event, arg) => {
  console.log('new-ticker', arg)  // prints "ping"
  stocksToCheck[arg] = true
  updateStocks()
  db.writeSync(stocksToCheck)
})

ipcMain.on('remove-ticker', (event, arg) => {
  console.log('remove-ticker', arg)  // prints "ping"
  delete stocksToCheck[arg.toLowerCase()]
  db.writeSync(stocksToCheck)
})

const Robinhood = require('robinhood')(creds, () => {
  console.info('robinhood is ready')
  setInterval(() => {
    let stc = Object.keys(stocksToCheck)
    console.log('stocksToCheck:', stc)
    if (!stc.length) return
    updateStocks()
  }, 30000)

});

function updateStocks() {
  let stc = Object.keys(stocksToCheck)
  Robinhood.quote_data(stc, function(err, response, body){
    if(err){
      console.error(err)
    }else{
      if (!body) return console.log(body)
      //event.sender.send('ticker-info', {})
      // event.sender.send('ticker-info', body)
      mainWindow.webContents.send('ticker-info', body.results)
      //{
      //    results: [
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
    }
  })
}
