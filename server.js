require('dotenv').config({ debug: true });
const express = require('express');
const app = express();
const cors = require('cors');
var admin = require('firebase-admin');

app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(cors({
    origin: '*'
}));
var cer = {
    "type": "service_account",
    "project_id": process.env.PROJECTID,
    "private_key_id": process.env.PRIVATEKEYID,
    "private_key": process.env.PRIVATEKEY,
    "client_email": process.env.CLIENTEMAIL,
    "client_id": process.env.CLIENTID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.CLIENTCERT,
    "universe_domain": "googleapis.com"
}

//initialize firebase admin
admin.initializeApp({
    credential: admin.credential.cert(cer)
});
const db = admin.firestore();

//map for encrypt and decrypt dictionary
let en_data = {
    'a': '8n', 'b': '37', 'c': 'Q8', 'd': 'zT', 'e': '1Z', 'f': '2Y', 'g': 'pj', 'h': '9wt', 'i': 'kz', 'j': '3s', 'k': 'rX', 'l': 'zb', 'm': 'sE', 'n': 'Mg', 'o': 'Ke', 'p': 'hP', 'q': 'nE', 'r': 'yB', 's': 'Pw', 't': 'xq', 'u': 'uT', 'v': '6v', 'w': 'T7', 'x': 'yI', 'y': 'CmW', 'z': 'R1',
    '0': 'Tk', '1': 'kV', '2': 'Bw', '3': 'zP', '4': 'Yo', '5': '4c', '6': 'Ar', '7': 'Dm', '8': 'U7', '9': 'Fw', ' ': 'qN', '.': 'vi', ',': 'Pq', ':': '3E'
}
const de_data = {};
for (const [key, value] of Object.entries(en_data)) {
    de_data[value] = key;
}
//encrypt function
function encrypt(e) {
    let encrypted = '';
    const normalizedText = e.toLowerCase();
    for (const char of normalizedText) {
        const substitution = en_data[char];
        if (substitution) {
            encrypted += substitution + 'a';
        } else {
            encrypted += char
        }
    }
    return encrypted.endsWith('a') ? encrypted.slice(0, -'a'.length) : encrypted
}
//decrypt function
function decrypt(e) {
    let text = '';
    const encrypt = e.split('a');
    for (const char of encrypt) {
        const origin = de_data[char];
        if (origin) {
            text += origin;
        } else {
            text += char
        }
    }
    return text
}
//generate student key
function generatekey(e) {
    let stringnum = String(e);
    let splitstring = stringnum.split('');
    let reversedstring = splitstring.reverse();
    let joinedstring = reversedstring.join('');
    let res = encrypt(joinedstring);
    return res;
}
//generate time
function getdate(e) {
    let jsdate = e.toDate();
    const formattedDate = jsdate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    return formattedDate;
}

app.get('/', (req, res) => {
    res.send('Home');
})
//get all cars
app.get('/api/cars', async (req, res) => {
    let got = await db.collection('cars').get();
    if (got.empty) {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    } else {
        let d = got.docs.map((doc) => ({
            id: doc.id,
            adddate: getdate(doc.data().time),
            ...doc.data()
        }))
        res.json({
            status: 'success',
            text: 'All cars data got.',
            data: d
        })
    }
})
//get all today cars
app.get('/api/today/cars', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let got = await db.collection('cars').where('dateOnly', '==', today).get();
    if (got.empty) {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    } else {
        let d = got.docs.map((doc) => ({
            id: doc.id,
            adddate: getdate(doc.data().time),
            ...doc.data()
        }))
        res.json({
            status: 'success',
            text: 'All today cars data got.',
            data: d
        })
    }
})
//add new car
app.post('/api/add/car', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            const today = new Date().toISOString().split('T')[0];
            let forid = recv.carplate + recv.carname;
            await db.collection('cars').doc(forid).set({
                cusname: recv.cusname,
                cusphone: recv.cusphone,
                cusadr: recv.cusaddr,
                carname: recv.carname,
                carplate: recv.carplate,
                vin: recv.vin,
                status: 'pending',
                dateOnly: today,
                services: {
                    about: recv.aboutcar,
                    fee: recv.fee,
                    reserve: recv.reserve,
                },
                time: admin.firestore.FieldValue.serverTimestamp(),
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'New car was added.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while adding new car!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to add new car!',
                data: []
            })
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})
//add more service
app.post('/api/more/service', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).update({
                services: admin.firestore.FieldValue.arrayUnion({
                    about:recv.about,
                    fee:recv.fee,
                    reserve:recv.reserve,
                    date:admin.firestore.FieldValue.serverTimestamp()
                }),
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'New car was added.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while adding new car!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to add new car!',
                data: []
            })
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})
//add new car
app.post('/api/update/car', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).update({
                cusname: recv.cusname,
                cusphone: recv.cusphone,
                cusadr: recv.cusaddr,
                carname: recv.carname,
                carplate: recv.carplate,
                vin: recv.vin,
                aboutcar: recv.aboutcar,
                fee: recv.fee,
                reserve: recv.reserve,
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'Car data was updated.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while updating car data!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to update car data!',
                data: []
            })
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})
//finish car service
app.post('/api/finish/car', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).update({
                status: 'finish'
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'Car service was updated to finish.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while updating car status!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to update car status!',
                data: []
            })
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})
//delete car
app.post('/api/delete/car', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).delete().then(() => {
                res.json({
                    status: 'success',
                    text: 'Car data was deleted.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while deleting car data!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to delete car data!',
                data: []
            })
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})

app.listen(80, () => {
    console.log('server started with port 80');
})