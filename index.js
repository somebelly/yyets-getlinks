const request = require('request-promise')
const cheerio = require('cheerio')

const loglevels = {
  quiet: -1,
  trace: 0,
  debug: 1,
  info: 2,
  warning: 3,
  error: 233
}
const logger = { level: 'info' }
logger.log = (level, ...sth) => {
  if (loglevels[level] >= loglevels[logger.level] && loglevels[logger.level] >= 0) {
    const now = new Date()
    const time = { hh: now.getHours(), mm: now.getMinutes(), ss: now.getSeconds() }

    for (const k in time) {
      if (time[k] < 10) {
        time[k] = `0${time[k]}`
      } else {
        time[k] = `${time[k]}`
      }
    }

    const t = `${time.hh}:${time.mm}:${time.ss}`
    console.log(`[${level.toUpperCase()}](${t})\t`, ...sth)
  }
}

async function getLinks (url) {
  const options = {
    uri: url,
    transform: function (body) {
      return cheerio.load(body)
    }
  }
  let resUrl, code
  logger.log('debug', 'Getting links...')

  await request(options)
    .then($ => {
      resUrl = $('script[src^="/resource"]').attr('src')
    })
    .catch((err) => {
      logger.log('error', err.message)
      logger.log('error', url)
      quit()
    })

  await request({ uri: `http://www.zmz2019.com${resUrl}` })
    .then(res => {
      const obj = JSON.parse(res.substring(res.indexOf('{'), res.lastIndexOf('}') + 1))
      const $ = cheerio.load(obj.resource_content)
      resUrl = $('a').attr('href')
      code = resUrl.substring(resUrl.indexOf('=') + 1, resUrl.length)
    })
    .catch((err) => {
      logger.log('error', err.message)
      logger.log('error', url)
      quit()
    })

  logger.log('info', `CODE: ${code}`)
  const links = []

  await request({ uri: `http://got001.com/api/v1/static/resource/detail?code=${code}` })
    .then(async res => {
      const mode = 'APP'
      JSON.parse(res).data.list.map(season => {
        if (season.formats.includes(mode)) {
          season.items[mode].map(link => links.push(link.name))
        }
      })

      const fs = require('fs')
      fs.writeFile('linklist.txt', links.join('\n'), function (err) {
        if (err) throw err
        logger.log('info', 'Saved.')
      })
    })
    .catch((err) => {
      logger.log('error', err.message)
      logger.log('error', url)
      quit()
    })
}

function quit () {
  logger.log('info', 'Quit.')
  process.exit()
}

function main () {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  readline.question('ID = ', async (id) => {
    console.log()
    logger.log('info', 'Started.')
    if (isNaN(id)) {
      logger.log('error', `Invalid ID: ${id}`)
      return
    }

    const url = `http://www.zmz2019.com/resource/${id}`
    logger.log('info', `URL: ${url}`)
    await getLinks(url)
    readline.close()
    quit()
  })
}

main()
