import mongoose from 'mongoose'

export const connectionDB = () => {
    mongoose.connect('mongodb+srv://admin:qwerty123@cluster0.wcqio.mongodb.net/fishing-db?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});
    mongoose.connection.on('connected', () => {
        console.log('DB is connected')
    })
}