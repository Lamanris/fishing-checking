import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer'
import path from 'path'
import {connectionDB} from "./mongoose/db.js"
import Sites from "./models/Sites.model.js"

const server = express()
connectionDB()

server.use(cors())
server.use(express.json())

const __dirname = path.resolve();
server.use(express.static(path.join(__dirname, 'frontend')));

server.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

server.post('/api/v1/find-site', async (req, res) => {
    const { value } = req.body
    await Sites.findOne({ value: value }, (err, site) => {
        if (err) {
            console.log('Ошибка поиска')
            return res.status(401).json({
                error: 'Ошибка поиска'
            })
        }
        return res.json(site)
    });
})

server.post('/api/v1/add-site', async (req, res) => {
    const { value } = req.body
    const newSite = new Sites({value})
    newSite.save((err, user) => {
        if (err) {
            console.log('Ошибка сохранения')
            return res.status(401).json({
                error: 'Ошибка сохранения сайта в базе данных'
            })
        }
        console.log('Сохранение успешно. Спасибо!')
        return res.json({
            message: 'Сохранение успешно. Спасибо!'
        })
    })
})

server.post('/api/v1/check-redirect', async (req, res) => {
    const { link } = req.body
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });
    const page = await browser.newPage();
    await page.goto(link);
    const url = await page. url();
    console.log("Link:", link)
    console. log("Redirected URL:", url);
    await browser.close();
    res.json(url)
})

server.listen(process.env.PORT || 3000, () => {
    console.log('Server is started')
})