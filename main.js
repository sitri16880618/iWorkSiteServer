const WebSocket = require('ws');
const dataHub = require('./tools/updateDataHub');

const ws = new WebSocket('ws://localhost:9090');

//在連線建立完成後傳送一條資訊
ws.on('open', function open() {
    console.log(new Date(), 'Connect to socket server successfully');
    ws.send('getAlarmHis');
});

ws.on('message', data => {
    data = JSON.parse(data);
    console.log(new Date, 'Received Event:', data.title);

    setTimeout(()=>{}, 1000);

    switch (data.title) {
        case "initTest":
            // console.log(new Date(), "Event:", data.data);
            break;
        case "FaceRecognitionEvent":
            dataHub.sendRecognizingData(data.data);
            break;
    }

});
