const edgeSDK = require("wisepaas-datahub-edge-nodejs-sdk");
const mysql = require('mysql');


// 定義門禁(ac)系統、監視(cv)系統的Node連線資訊
const subSystemConfig = {
    ac: {
        nodeId: "d6a4145d-2f2d-4f6e-9d14-5fa8710ac9c0",
        credentialKey: "7bc6e8c5fcb0f8fceefbdf6b1ee8b9l6",
    },
    cv: {
        nodeId: "baa873da-c97a-411c-9627-6af8429bdfb2",
        credentialKey: "f4306bf5bba38f231d8da999879892lz",
    },
};

// Datahub 連線設定
function options(system) {
    return {
        connectType: edgeSDK.constant.connectType.DCCS,
        DCCS: {
            credentialKey: system.credentialKey,
            APIUrl: "https://api-dccs-ensaas.sa.wise-paas.com/",
        },
        useSecure: false,
        autoReconnect: true,
        reconnectInterval: 1000,
        nodeId: system.nodeId,
        type: edgeSDK.constant.edgeType.Gateway,
        heartbeat: 60000,
        dataRecover: true,
    };
}

// var edgeAgent_statis = new edgeSDK.EdgeAgent(options(subSystemConfig.ac));
// edgeAgent_statis.connect();
// edgeAgent_statis.events.on("connected", () => {
//     console.log(new Date(), "edgeAgent_statis device Connected");
// });

// 建立MYSQL連線
var conn = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'sa',
    database: 'iworksite'
});

// 建立連線後不論是否成功都會呼叫
conn.connect(function (err) {
    if (err) throw err;
    console.log(new Date(), 'DB connected');
});

module.exports = {
    conn: conn,
    getPersonStatis: function (agent) {
        let sql = `SELECT *
                FROM person_attendance_record a

                INNER JOIN ( select max(triggerTime) as mt, personID 
                                from person_attendance_record
                                where DATE(triggerTime)=CURDATE()
                                group by personID ) m 
                ON a.triggerTime = m.mt and a.personID = m.personID`;

        let totalPerson = 0, innerPerson = 0, outterPerson = 0, notWearRespirator = 0, notWearHardhat = 0, notWearVest = 0;

        conn.query(sql, function (err, result, fields) {
            if (err) throw err;

            result.forEach(element => {
                totalPerson++;

                ///////////////// 場內及離場人數 /////////////////
                if (element.deviceID.charAt(1) == '0') {
                    innerPerson++;
                    /***************** 特徵結果統計 *****************/
                    if (element.respirator == '1') notWearRespirator++; // 未配戴口罩人數
                    if (element.hardHat == '1') notWearHardhat++; // 未配戴安全帽人數
                    if (element.vest == '1') notWearVest++; // 未穿戴背心人數
                }
                else outterPerson++;
            });

            // console.log("今日總人數", totalPerson);
            // console.log("場內人數", innerPerson);
            // console.log("離場人數", outterPerson);
            // console.log("未配戴口罩人數", notWearRespirator);
            // console.log("未配戴安全帽人數", notWearHardhat);
            // console.log("未穿戴背心人數", notWearVest);


            let rs = {
                'totalPerson': totalPerson,
                'innerPerson': innerPerson,
                'outterPerson': outterPerson,
                'notWearRespirator': notWearRespirator,
                'notWearHardhat': notWearHardhat,
                'notWearVest': notWearVest,
            };

            let getUpdateDataset = new Promise((resolve, reject) => {
                let data = new edgeSDK.EdgeData();
                let n = 0;
                for (let key in rs) {
                    n++;
                    let DTag = new edgeSDK.EdgeDataTag();
                    DTag.deviceId = 'D000';
                    DTag.tagName = key; // 以表格欄位名稱當作Datahub tagName
                    DTag.value = rs[key];
                    data.tagList.push(DTag);
                    if (n == 6) {
                        resolve(data);
                    }
                }
                // setTimeout(() => {
                //     resolve(data);
                // }, 1000);
            });

            getUpdateDataset.then(d => {
                d.ts = Date.now();
                try {
                    agent.sendData(d);
                    console.log(new Date(), "Update Statis data successfully");
                } catch (error) {
                    console.log(error)
                }
            }).catch(err => {
                console.log(err);
            });

        });
    },
    getWorkTime: function () {
        let sql = `SELECT u.name as unit, SUM(pw.workTime) as workTime 
                    FROM person_worktime_record pw 
                    JOIN unit u on pw.unit = u.id
                    GROUP BY pw.unit
            -- WHERE DATE(startTime)=CURDATE();`;

        let unitWorktime = Array();

        conn.query(sql, function (err, result, fields) {
            if (err) throw err;

            result.forEach(element => {
                unitWorktime.push({
                    unit: element.unit,
                    workTime: element.workTime
                });
                console.log(element.unit, element.workTime);
            });

            return unitWorktime;
        });

    }
};