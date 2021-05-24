const defaultForm = document.querySelectorAll('.form')
const formMessage = document.querySelector('.form-message')
const formLink = document.querySelector('.form-link')
const loader = document.querySelector('.loader')
const btnCheckMessage = document.querySelector('.btn-check-message')
const btnCheckLink = document.querySelector('.btn-check-link')

btnCheckMessage.addEventListener('click', () => {
    btnCheckLink.classList.remove('active')
    formLink.classList.remove('active')
    btnCheckMessage.classList.add('active')
    formMessage.classList.add('active')
})

btnCheckLink.addEventListener('click', () => {
    btnCheckMessage.classList.remove('active')
    formMessage.classList.remove('active')
    btnCheckLink.classList.add('active')
    formLink.classList.add('active')
})

defaultForm.forEach(el => {
    el.addEventListener('submit', (e) => {
        e.preventDefault()
        let data = new FormData(el);
        let dataObj = {}
        for (let [key, value] of data) {
            dataObj = {...dataObj, [key] : value}
        }
        validation(dataObj)
    })
})

const banWords = ['последнее предупреждение', 'срочная проверка', 'быстрое блокирование', 'немедленно', 'останнє попередження', 'термінова перевірка', 'швидке блокування', 'негайно', 'користувач', 'клієнт', 'пользователь', 'клиент', 'Дорогой клиент', 'уважаемый']

async function validation (data) {
    if (data.message) {
        loader.classList.add('_loading')
        let error = await messageValidation(data.message)
        console.log(error)
        if (error === 1) {
            loader.classList.remove('_loading')
            alert("Обережно! Даний контент не є безпечним")
        } else if (error > 1) {
            loader.classList.remove('_loading')
            alert("Даний лист є фішинговим! Перемістіть його в папку спам")
        } else {
            if(data.message.includes('https://') || data.message.includes('http://')) {
                let link
                if (data.message.trim().split(' ').length === 1) {
                    link = data.message.trim()
                } else {
                    let startLink = data.message.indexOf('http')
                    let slicedMessage = data.message.slice(startLink)
                    if (slicedMessage.trim().split(' ').length === 1) {
                        link = slicedMessage
                    } else {
                        link = slicedMessage.slice(0, (slicedMessage.indexOf(' ')))
                    }
                }
                error = await linkValidation(link, error)
                console.log(error)
                if (error === 'Нерабочая ссылка') {
                    loader.classList.remove('_loading')
                    alert('Нерабочая ссылка')
                } else {
                    linkValidateConclusion(data.link, error)
                }
            } else {
                loader.classList.remove('_loading')
                alert("Лист безпечний!")
            }
        }
    }
    if (data.link) {
        loader.classList.add('_loading')
        if(!data.link.includes('http://') && !data.link.includes('https://')) {
            alert('Пожалуйста введите правильный формат ссылки: \n https://example.com  | http://example.com')
            loader.classList.remove('_loading')
        } else {
            let error = 0
            error = await linkValidation(data.link, error)
            console.log(error)
            if (error === 'Нерабочая ссылка') {
                loader.classList.remove('_loading')
                alert('Нерабочая ссылка')
            } else {
                linkValidateConclusion(data.link, error)
            }
        }
    }
}

async function messageValidation (message) {
    let error = 0
    let banWordsTimes = banWords.map(el => message.toLowerCase().includes(el.toLowerCase()))
    if (banWordsTimes.includes(true)) {
        error++
        console.log('Письмо содержит подозрительные слова')
    }
    if (message.indexOf('!') !== message.lastIndexOf('!')) {
        error++
        console.log('Письмо содержит больше одного - !')
    }
    error = await grammarValidation(message, error)
    error = await greetingValidation(message, error)
    return error
}

async function grammarValidation (message, error) {
    const joinedMessage = message.replace(/ /g, '+')
    await axios.get(`https://speller.yandex.net/services/spellservice.json/checkText?text=${joinedMessage}&lang=uk,ru&options=6`)
        .then((res) => {
            if (res.data.length) {
                console.log('Письмо содержит грамматические ошибки')
                error++
            }
        })
        .catch((err) => {
            console.log(err)
        })
    return error
}
function greetingValidation (message, error) {
    const greets = ['Доброго дня', 'Вітаю', 'Шановний', 'Здравствуй', 'Здравствуйте', 'Доброго времени суток', 'Уважаемый', 'Добрий день', 'Доброго ранку!', 'Добривечір!', 'Дорогой']
    const lowMessage = message.toLowerCase()
    greets.forEach(el => {
        const lowWord = el.toLowerCase()
        if (lowMessage.includes(lowWord)) {
            let startIndex = lowMessage.indexOf(lowWord)
            let slicedContext = message.slice(startIndex, startIndex + lowWord.length + 3)
            if (slicedContext[slicedContext.length - 3] === ',') {
                if (slicedContext[slicedContext.length - 2] === ' ') {
                    if (slicedContext[slicedContext.length - 1] !== slicedContext[slicedContext.length - 1].toUpperCase()) {
                        error++
                        console.log('После обращения, слово начинается с маленькой буквы')
                    }
                } else {
                    if (slicedContext[slicedContext.length - 2] !== slicedContext[slicedContext.length - 2].toUpperCase()) {
                        error++
                        console.log('После обращения, слово начинается с маленькой буквы')
                    }
                }
            }
        }
    })
    return error
}

async function linkValidation (link, error) {
    if (link.match(/[0-9]+[0-9]+[0-9]+[.]+[0-9]/) || link.match(/[0-9]+[0-9]+[.]/)) {
        error++
        console.log('Ссылка содержит ip адрес')
    }
    if (!link.includes('https')) {
        error++
        console.log('Ссылка не https')
    }
    error = await fishingDbSites(link, error)
    error = await domainValidation(link, error)
    error = await subdomainsQuantities(link, error)
    error = await checkRedirect(link, error)
    return error
}

const apiKey = "at_gyFzrALICXpppEpQaRLKMVho24pws";
async function domainValidation (link, error) {
    const linkDomain = link.slice(link.indexOf('://') + 3)
    const domain = linkDomain.split('/')[0]
    const url = 'https://www.whoisxmlapi.com/whoisserver/WhoisService?';
    let result
    try {
        result = await $.ajax({
            url: url,
            dataType: "json",
            data: {
                domainName: domain,
                apiKey: apiKey,
                outputFormat: 'JSON'
            },
            complete: function (data) {
                return data
            }
        });
        const creationDate = new Date(result.WhoisRecord.registryData.createdDate).getTime()
        const lastMonth =  new Date().getTime() - 2629743000
        if (creationDate > lastMonth) {
            error++
            console.log('Домен отправителя был создан меньше чем месяц назад')
        }
        return error
    } catch (error) {
        console.error(error)
    }

}
async function subdomainsQuantities (link, error) {
    const linkDomain = link.slice(link.indexOf('://') + 3)
    const domain = linkDomain.split('/')[0]
    const url = `https://subdomains.whoisxmlapi.com/api/v1?apiKey=${apiKey}&domainName=${domain}`;
    let result
    try {
        result = await $.ajax({
            url: url,
            dataType: "json",
            complete: function (data) {
                return data
            }
        });
        if (result.result.count > 3) {
            error++
            console.log('Домен ссылки имеет больше 3 поддоменов')
        }
    } catch (error) {
        console.log(error)
    }
    return error
}
async function fishingDbSites (link, error) {
    try {
        await axios.post('https://fishing-checking.herokuapp.com/api/v1/find-site', {value: link})
            .then((res) => {
                if (res.data) {
                    error++
                    console.log('Ссылка находится в фишинговый базе данных')
                }
            })
            .catch((err) => {
                console.log(err)
            })
    } catch (error) {
        console.log(error)
    }
    return error
}
async function checkRedirect (link, error) {
    try {
        await axios.post('https://fishing-checking.herokuapp.com/api/v1/check-redirect', {link: link})
            .then((res) => {
                if (res.data === 'The link is invalid') {
                    error = 'Нерабочая ссылка'
                } else {
                    const redirectedDomain = (res.data.slice(res.data.indexOf('://') + 3)).split('/')[0]
                    const linkDomain = (link.slice(link.indexOf('://') + 3)).split('/')[0]
                    if (!redirectedDomain.includes(linkDomain)) {
                        error++
                        console.log('Ссылка переносит на другой сайт')
                    }
                }
            })
            .catch((err) => {
                console.log(err)
            })
    } catch (error) {
        console.log(error)
    }
    return error
}

async function linkValidateConclusion (link, error) {
    let subdomainsErrors = 0
    subdomainsErrors = await subdomainsQuantities(link, subdomainsErrors)
    if (error === 1) {
        loader.classList.remove('_loading')
        alert("Обережно! Даний сайт не є безпечним!")
    } else if (error > 1 || link.includes('http://') || link.match(/[0-9]+[0-9]+[0-9]+[.]+[0-9]/) || subdomainsErrors === 1) {
        loader.classList.remove('_loading')
        alert("Обережно! Даний сайт не є безпечним, Даний сайт є фішинговим! Перехід за посиланням є небезпечним.")
        axios.post('https://fishing-checking.herokuapp.com/api/v1/find-site', {value: link})
            .then((res) => {
                if (!res.data) {
                    if (confirm("Добавить сайт в базу данных фишинг-сайтов?")) {
                        axios.post('https://fishing-checking.herokuapp.com/api/v1/add-site', {value: link})
                            .then((res) => {
                                console.log(res.data.message)
                                alert(res.data.message)
                            })
                            .catch((err) => {
                                console.log(err)
                            })
                    } else {
                        console.log('Вы отменили добавление!')
                    }
                }
            })
            .catch((err) => {
                console.log(err)
            })
    } else {
        loader.classList.remove('_loading')
        alert("Посилання безпечне!")
    }
}
