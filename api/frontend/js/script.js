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

const banWords = ['последнее предупреждение', 'срочная проверка', 'быстрое блокирование', 'немедленно', 'останнє попередження', 'термінова перевірка', 'швидке блокування', 'негайно']

async function validation (data) {
    if (data.message) {
        loader.classList.add('_loading')
        let error = await messageValidation(data.message)
        error = await domainValidation(data.email, error)
        let banWordsTimes = banWords.map(el => data.message.includes(el))
        if (error === 1) {
            loader.classList.remove('_loading')
            alert("Обережно! Даний контент не є безпечним")
        } else if (error > 1 || banWordsTimes.includes(true)) {
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
                linkValidateConclusion(link, error)
            } else {
                loader.classList.remove('_loading')
                alert("Письмо безопасно!")
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
            linkValidateConclusion(data.link, error)
        }
    }
}

async function messageValidation (message) {
    let error = 0
    let banWordsTimes = banWords.map(el => message.includes(el))
    if (banWordsTimes.includes(true)) {
        error++
        console.log('Письмо содержит подозрительные слова')
    }
    if (message.indexOf('!') !== message.lastIndexOf('!')) {
        error++
        console.log('Письмо содержит больше одного - !')
    }

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
async function linkValidation (link, error) {
    if (link.match(/[0-9]+[0-9]+[0-9]+[.]+[0-9]/) || link.match(/[0-9]+[0-9]+[.]/)) {
        error++
        console.log('The link contains ip address')
    }
    if (!link.includes('https')) {
        error++
        console.log('The link is not https')
    }
    error = await fishingDbSites(link, error)
    error = await subdomainsQuantities(link, error)
    error = await checkRedirect(link, error)
    return error
}

const apiKey = "at_YkkytHcD5l6M0mJeb0nzlcxyp8i56";
async function domainValidation (email, error) {
    const domain = email.slice(email.indexOf('@') + 1)
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
            console.log('The domain of sender was created recently')
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
            console.log('The domain of link has more than 3 subdomains')
        }
    } catch (error) {
        console.error(error)
    }
    return error
}
async function fishingDbSites (link, error) {
    await axios.post('http://localhost:3000/api/v1/find-site', {value: link})
        .then((res) => {
            if (res.data) {
                error++
                console.log('The link is in the fishing database')
            }
        })
        .catch((err) => {
            console.log(err)
        })
    return error
}
async function checkRedirect (link, error) {
    await axios.post('http://localhost:3000/api/v1/check-redirect', {link: link})
        .then((res) => {
            const redirectedDomain = (res.data.slice(res.data.indexOf('://') + 3)).split('/')[0]
            const linkDomain = (link.slice(link.indexOf('://') + 3)).split('/')[0]
            if (!redirectedDomain.includes(linkDomain)) {
                error++
                console.log('The link is redirecting to another page')
            }
        })
        .catch((err) => {
            console.log(err)
        })
    return error
}


function linkValidateConclusion (link, error) {
    if (error === 1) {
        loader.classList.remove('_loading')
        alert("Обережно! Даний контент не є безпечним")
    } else if (error > 1 || link.includes('http://') || link.match(/[0-9]+[0-9]+[0-9]+[.]+[0-9]/)) {
        loader.classList.remove('_loading')
        alert("Даний лист є фішинговим! Перемістіть його в папку спам")
        axios.post('http://localhost:3000/api/v1/find-site', {value: link})
            .then((res) => {
                if (!res.data) {
                    if (confirm("Добавить сайт в базу данных фишинг-сайтов?")) {
                        axios.post('http://localhost:3000/api/v1/add-site', {value: link})
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
        alert("Письмо безопасно!")
    }
}
