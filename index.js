const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require("fs");

const token = '6689288367:AAFXRjROmZkXUzJ5EmA8SxwoqyvnMAqp3Q0';

const bot = new TelegramBot(token, { polling: true })
let receive = false;
let receivingAlias = false;
let videos = [];
let images = [];

// random id function
function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}


let postFileName = null;
let uid = null;
let baseLink = "https://t.me/Thelinksendbysykerbot?start=";


// message response
bot.on("message", async (msg) => {
    console.log(msg)
    
    const chatid = msg.chat.id;
    const adminId = "5113588348";
    const admin = (chatid == adminId);
    const name = msg.chat.first_name;
    const message = msg.text || false;
    const entities = msg.entities || false;
    const cmd = entities ? message.slice(entities[0].offset,entities[0].length) : false;

    fs.readFile("users.json", function(err, json) {
        let data = JSON.parse(json);
        if(!data.users_id.includes(chatid)){
            data.users_id.push(chatid);
            fs.writeFile("users.json", JSON.stringify(data), err => {
                if(err){
                bot.sendMessage("Something went wrong. Please try again latter.");
                throw err;
            }});
        }
    })
    if(receivingAlias){
        fs.readFile("id.json", function(err, json) {
                
            // Check for errors
            if (err) throw err;
        
            // Converting to JSON
            let data = JSON.parse(json);
            if(data.alias.includes(message)){
                bot.sendMessage(chatid,"This alias already exists. Please try again.");
            }else{
                uid = makeid(10);
                while(data.uid.includes(uid)){
                    uid = makeid(10);
                }
                data.id.push({"alias":message, "uid": uid});
                data.alias.push(message);
                data.uid.push(uid);
                postFileName = "./posts/" + message + ".json";

                fs.writeFile("id.json", JSON.stringify(data), err => {
 
                    // Checking for errors
                    if(err){
                        bot.sendMessage("Something went wrong. Please try again latter.");
                        throw err;
                    }else{
                        receivingAlias = false;
                        receive = true;
                        const opts = {
                            reply_markup: JSON.stringify({
                                resize_keyboard: true,
                                one_time_keyboard: true,
                                remove_keyboard: true,
                                keyboard: [["/receiveOff"]]
                            })
                        };
                        bot.sendMessage(chatid, "Receiving turned on. Please provide photos and/or videos.", opts);
                    }
                });
            }
        });
    }
    else if(entities && message){
        if(cmd == "/admin" && admin){
            const opts = {
                reply_markup: JSON.stringify({
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    remove_keyboard: true,
                    keyboard: [["/receive","/total_users"]]
                })
          };
          bot.sendMessage(chatid,"admin activated", opts);
        }
        else if(cmd == "/receive" && admin){
            receivingAlias = true;
            bot.sendMessage(chatid, "Please provide alias.");
        }
        else if(cmd == "/receiveOff" && admin){
            receive = false;
            fs.writeFile(postFileName, JSON.stringify({"videos": videos,"images": images}), err => {
                if(err){
                    bot.sendMessage("Something went wrong. Please try again latter.");
                    throw err;
                }else{
                    let donemsg = images.length + " images and " + videos.length + " videos, Saved successfully!";
                    let link = baseLink + uid;
                    bot.sendMessage(chatid,donemsg);
                    bot.sendMessage(chatid,"The link of provided media : " + link);
                    videos = [];
                    images = [];
                }
            })
            const opts = {
                reply_markup: JSON.stringify({
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    remove_keyboard: true,
                    keyboard: [["/receive","/total_users"]]
                })
          };
          bot.sendMessage(chatid,"Receiving turned off.", opts);
        }
        else if(cmd == "/total_users" && admin){
            fs.readFile("users.json",(err,json)=>{
                if(err){
                    bot.sendMessage(chatid,"Something went wrong!");
                }
                let data = JSON.parse(json);
                let msg = "Total users: " + data.users_id.length;
                bot.sendMessage(chatid,msg)
            })
        }
        else if(cmd == "/start" && message.split(" ").length == 2){
            let param = message.split(" ")[1];
            fs.readFile("id.json",(err,json)=>{
                let data = JSON.parse(json);
                data.id.forEach(element => {
                    if(element.uid == param){
                        let id = element.alias;
                        let path = "./posts/" + id + ".json";
                        fs.readFile(path,(err,json2)=>{
                            let data2 = JSON.parse(json2);
                            data2.images.forEach(img => {
                                bot.sendPhoto(chatid,img)
                            })
                            data2.videos.forEach(vid => {
                                bot.sendVideo(chatid,vid)
                            })
                        })
                    }
                });
            })
        }
    }
    else if(msg.video){
        if(receive && admin){
            videos.push(msg.video.file_id);
            bot.sendMessage(chatid,"Video received.",{reply_to_message_id: msg.message_id})
        }else if(!receive && admin){
            bot.sendMessage(chatid,"Receiving is off",{reply_to_message_id: msg.message_id});
        }
    }
    else if(msg.photo){
        if(receive && admin){
            images.push(msg.photo[0].file_id)
            bot.sendMessage(chatid,"Photo received.",{reply_to_message_id: msg.message_id})
        }else if(!receive && admin){
            bot.sendMessage(chatid,"Receiving is off",{reply_to_message_id: msg.message_id});
        }
    }
})