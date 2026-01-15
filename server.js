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
    if (!recv || !recv.carplate || !recv.carname) {
        return res.json({ status: 'fail', text: 'Missing required data!', data: [] });
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        let forid = recv.carplate + recv.carname;
        const docRef = db.collection('cars').doc(forid);
        const doc = await docRef.get();
        const serviceData = {
            about: recv.aboutfee,
            fee: recv.fee,
            reserve: recv.reserve,
            status: 'pending',
        };
        if (!doc.exists) {
            await docRef.set({
                cusname: recv.cusname,
                cusphone: recv.cusphone,
                cusadr: recv.cusaddr,
                carname: recv.carname,
                carplate: recv.carplate,
                chargeperson: recv.chargeperson,
                vin: recv.vin,
                dateOnly: today,
                aboutcar: recv.aboutcar,
                services: [serviceData],
                time: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await docRef.update({
                services: admin.firestore.FieldValue.arrayUnion(serviceData)
            });
        }
        res.json({
            status: 'success',
            text: 'New car/service was added.',
            data: []
        });
    } catch (e) {
        console.error(e);
        res.json({
            status: 'fail',
            text: 'Internal Server Error',
            data: []
        });
    }
});
//add more service
app.post('/api/more/service', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).update({
                services: admin.firestore.FieldValue.arrayUnion({
                    about: recv.about,
                    fee: recv.fee,
                    reserve: recv.reserve,
                    status: 'pending'
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
                });
                console.log(error);
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to add new car!',
                data: []
            });
            console.log(e);
        }
    } else {
        res.json({
            status: 'fail',
            text: 'Something went wrong!',
            data: []
        })
    }
})
//update car
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
                chargeperson: recv.chargeperson,
                vin: recv.vin,
                aboutcar: recv.aboutcar
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
//update about car
app.post('/api/update/aboutcar', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('cars').doc(recv.id).update({
                aboutcar: recv.aboutcar
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'About car was updated.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while updating about car!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to update about car!',
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
app.post('/api/finish/service', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            let docref = db.collection('cars').doc(recv.id);
            let doc = await docref.get();
            if (doc.exists) {
                let services = doc.data().services;
                if (services && services.length > 0) {
                    services[recv.index] = {
                        ...services[recv.index],
                        status: 'finish'
                    };
                    await docref.update({ services: services }).then(() => {
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
                    });
                } else {
                    res.json({
                        status: 'fail',
                        text: 'No service to set finish!',
                        data: []
                    })
                }
            } else {
                res.json({
                    status: 'fail',
                    text: 'No document found with this ID!',
                    data: []
                })
            }
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
//update reserve
app.post('/api/update/service/reserve', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            let docref = db.collection('cars').doc(recv.id);
            let doc = await docref.get();
            if (doc.exists) {
                let services = doc.data().services;
                if (services && services.length > 0) {
                    services[recv.index] = {
                        ...services[recv.index],
                        reserve: recv.reserve
                    };
                    await docref.update({ services: services }).then(() => {
                        res.json({
                            status: 'success',
                            text: 'Car service reserve was updated.',
                            data: []
                        })
                    }).catch(error => {
                        res.json({
                            status: 'fail',
                            text: 'Something went wrong while updating car reserve!',
                            data: []
                        })
                    });
                } else {
                    res.json({
                        status: 'fail',
                        text: 'No service to update!',
                        data: []
                    })
                }
            } else {
                res.json({
                    status: 'fail',
                    text: 'No document found with this ID!',
                    data: []
                })
            }
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to update car reserve!',
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
//delete car service
app.post('/api/delete/service', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            let docref = db.collection('cars').doc(recv.id);
            let doc = await docref.get();
            if (doc.exists) {
                let services = doc.data().services;
                if (services && services.length > 1) {
                    services.splice(recv.index, 1);
                    await docref.update({ services: services }).then(() => {
                        res.json({
                            status: 'success',
                            text: 'Car service was deleted.',
                            data: []
                        })
                    }).catch(error => {
                        res.json({
                            status: 'fail',
                            text: 'Something went wrong while deleting car service!',
                            data: []
                        })
                    });
                } else {
                    res.json({
                        status: 'fail',
                        text: 'No service to delete!',
                        data: []
                    })
                }
            } else {
                res.json({
                    status: 'fail',
                    text: 'No document found with this ID!',
                    data: []
                })
            }
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

//get all products
app.get('/api/products', async (req, res) => {
    let got = await db.collection('products').get();
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
            text: 'All products data got.',
            data: d
        })
    }
})
//add new product
app.post('/api/add/product', async (req, res) => {
    let recv = req.body;
    try {
        const docRef = db.collection('products');
        await docRef.add({
            name: recv.name,
            brand: recv.brand,
            cate: recv.cate,
            size: recv.size,
            quantity: recv.quantity,
            price: recv.price,
            note: recv.note,
            time: admin.firestore.FieldValue.serverTimestamp(),
        }).then(() => {
            res.json({
                status: 'success',
                text: 'New product was added.',
                data: []
            });
        });
    } catch (e) {
        console.error(e);
        res.json({
            status: 'fail',
            text: 'Internal Server Error',
            data: []
        });
    }
});
//update product
app.post('/api/update/product', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('products').doc(recv.id).update({
                name: recv.name,
                brand: recv.brand,
                cate: recv.cate,
                size: recv.size,
                quantity: recv.quantity,
                price: recv.price,
                note: recv.note,
            }).then(() => {
                res.json({
                    status: 'success',
                    text: 'Product data was updated.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while updating product data!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to update product data!',
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
//delete product
app.post('/api/delete/product', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            await db.collection('products').doc(recv.id).delete().then(() => {
                res.json({
                    status: 'success',
                    text: 'Product was deleted.',
                    data: []
                })
            }).catch(error => {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong while deleting product!',
                    data: []
                })
            })
        } catch (e) {
            res.json({
                status: 'fail',
                text: 'Something went wrong to delete product!',
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

//sell product and decrease product quantity
async function decreaseStock(cart) {
    try {
        await db.runTransaction(async (t) => {
            const updatePromises = cart.map(async (item) => {
                const itemRef = db.collection('products').doc(item.id);
                const doc = await t.get(itemRef);
                if (!doc.exists) {
                    throw new Error(`Product ${item.id} does not exist!`);
                }
                const currentStock = doc.data().quantity;
                if (currentStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.id}. Available: ${currentStock}`);
                }
                const newQuantity = parseInt(currentStock) - parseInt(item.quantity);
                t.update(itemRef, { quantity: newQuantity });
            });
            await Promise.all(updatePromises);
        });
        console.log('Stock updated successfully!');
        return { success: true };
    } catch (error) {
        console.error('Transaction failed: ', error.message);
        return { success: false, error: error.message };
    }
}
app.post('/api/sell/product', async (req, res) => {
    let recv = req.body;
    if (recv) {
        try {
            let sta = await decreaseStock(recv.products);
            if (sta.success) {
                await db.collection('history').add({
                    products: recv.products,
                    time: admin.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    res.json({
                        status: 'success',
                        text: 'Successfully sell.',
                        data: []
                    })
                })
            } else {
                res.json({
                    status: 'fail',
                    text: 'Something went wrong to update sell product data!',
                    data: []
                })
            }
        } catch (e) {
            console.log(e);
            res.json({
                status: 'fail',
                text: 'Something went wrong to update sell product data!',
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

//get all history
app.get('/api/history', async (req, res) => {
    let got = await db.collection('history').get();
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
            text: 'All history data got.',
            data: d
        })
    }
})

app.listen(80, () => {
    console.log('server started with port 80');
})