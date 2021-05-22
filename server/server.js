import express from 'express'
import cors from 'cors'
import {connectionDB} from "./mongoose/db.js"
import Sites from "./models/Sites.model.js"

const server = express()
connectionDB()

server.use(cors())
server.use(express.json())

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

server.listen(3000, () => {
    console.log('Server is started')
})