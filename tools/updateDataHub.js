const edgeSDK = require("wisepaas-datahub-edge-nodejs-sdk");
// const axios = require("axios");
const db = require("./getData");

const ipcamList = [];

// 定義門禁(ac)系統、監視(cv)系統的Node連線資訊
const subSystemConfig = {
    ac: {
        nodeId: "b9e75a38-b8e2-483c-b911-a6f911ca9f3e",
        credentialKey: "3f52957bae4ee7e2d0fe0ae5f015b9ml",
    },
    cv: {
        nodeId: "2982270b-d356-459c-856f-e8d312393061",
        credentialKey: "d84f3523d1037b413f637db05451b926",
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

var edgeAgent = new edgeSDK.EdgeAgent(options(subSystemConfig.ac));
// var edgeAgent_cv = new edgeSDK.EdgeAgent(options(subSystemConfig.cv));
edgeAgent.connect();
// edgeAgent_cv.connect();

// 人臉門禁系統Node連線成功
edgeAgent.events.on("connected", () => {
    console.log(new Date(), "AS node Connected");

    edgeConfig = prepareConfig("人臉門禁");
    prepareConfig("人臉門禁")
        .then((config) => {
            // 得到設定後上傳設定到DataHub
            edgeAgent.uploadConfig(edgeSDK.constant.actionType.create, config).then(
                (res) => {
                    console.log(new Date(), "Upload AS config successfully");
                    sendDeviceData(edgeAgent);
                },
                (error) => {
                    console.log(new Date(), "Upload AS config failed");
                    console.log(error);
                }
            );
        })
        .catch((error) => {
            console.log(error);
        });
});

// 監視系統Node連線成功
// edgeAgent_cv.events.on("connected", () => {
//     console.log(new Date(), "CV node Connected");

//     prepareConfig("監視")
//         .then((config) => {
//             // 得到設定後上傳設定到DataHub
//             edgeAgent_cv
//                 .uploadConfig(edgeSDK.constant.actionType.create, config)
//                 .then(
//                     (res) => {
//                         console.log(new Date(), "Upload CV config successfully");
//                         sendDeviceData(edgeAgent_cv);
//                     },
//                     (error) => {
//                         console.log(new Date(), "Upload CV config failed");
//                         console.log(error);
//                     }
//                 );
//         })
//         .catch((error) => {
//             console.log(error);
//         });
// });

function prepareConfig(system) {
    return new Promise(function (resolve, reject) {
        let edgeConfig = new edgeSDK.EdgeConfig();

        db.conn.query(`SELECT * FROM device_list;`, function (err, result, fields) {
            if (err) throw err;
            for (const row of result) {

                // server自行儲存deviceId，隨機產生模擬數據用
                ipcamList.push(row.deviceID);

                if (system == "監視" && row.deviceID == "D000") continue;

                let textTagList = [];
                let analogTagList = [];
                let discreteTagList = [];
                let deviceConfig = new edgeSDK.DeviceConfig();
                deviceConfig.id = row.deviceID;
                // 監視系統的設備命名為 MSCam-01~MSCam-16
                // 門禁系統為 ACSCam-01~ACSCam-16
                if (system == "監視") deviceConfig.name = "MS" + row.deviceNumber.substr(2, 6);
                else deviceConfig.name = "ACS" + row.deviceNumber.substr(2, 6);
                deviceConfig.type = row.type;
                deviceConfig.description = row.description;

                db.conn.query(
                    `SELECT id, name, description, monitorType FROM tag_list WHERE system = '${system}';`,
                    function (err, rs, fields) {
                        if (err) throw err;

                        for (const tag of rs) {
                            // 判斷是否為蒐集統計數值的虛擬設備，其統計數值Tag ID為74~79
                            // 一般設備不需設置統計數值Tag，故設條件跳過
                            if (row.deviceID != "D000" && tag.id >= 74 && tag.id <= 79)
                                continue;
                            if (row.deviceID == "D000" && (tag.id < 74 || tag.id > 79))
                                continue;

                            // 如果為入場攝影機，跳過離場TAG；反之則跳過進場TAG
                            if (
                                row.deviceID.slice(1, 2) == "0" &&
                                tag.name.slice(2, 3) == "離"
                            )
                                continue;
                            if (
                                row.deviceID.slice(1, 2) == "1" &&
                                tag.name.slice(2, 3) == "進"
                            )
                                continue;

                            // 設定檔中 2:文字, 1:離散 , 0:數值 型資料
                            if (tag.monitorType == 1) {
                                let discreteTagConfig = new edgeSDK.DiscreteTagConfig();
                                discreteTagConfig.name = tag.name;
                                discreteTagConfig.description = tag.description;
                                discreteTagList.push(discreteTagConfig);
                            } else if (tag.monitorType == 2) {
                                let textTagConfig = new edgeSDK.TextTagConfig();
                                textTagConfig.name = tag.name;
                                textTagConfig.description = tag.description;
                                textTagList.push(textTagConfig);
                            } else if (tag.monitorType == 0) {
                                let analogTagConfig = new edgeSDK.AnalogTagConfig();
                                analogTagConfig.name = tag.name;
                                analogTagConfig.description = tag.description;
                                analogTagList.push(analogTagConfig);
                            }
                        }

                        setTimeout(() => {
                            deviceConfig.discreteTagList = discreteTagList;
                            deviceConfig.textTagList = textTagList;
                            deviceConfig.analogTagList = analogTagList;
                            edgeConfig.node.deviceList.push(deviceConfig);
                        }, 500);
                    }
                );
            }
        });

        setTimeout(() => {
            resolve(edgeConfig);
        }, 1000);

    });
}

function sendDeviceData(agent) {
    db.conn.query(`SELECT * FROM device_list;`, function (err, result, fields) {
        if (err) throw err;

        let getTagsData = new Promise(function (resolve, reject) {
            let data = new edgeSDK.EdgeData();
            for (const row of result) {
                // 人口統計數值不需要設備基本資訊
                if (row.deviceID == "D000") continue;

                for (let key in row) {
                    // console.log(key, row[key]);
                    let DTag = new edgeSDK.EdgeDataTag();
                    DTag.deviceId = row.deviceID;
                    DTag.tagName = key; // 以表格欄位名稱當作Datahub tagName
                    DTag.value = row[key];
                    data.tagList.push(DTag);
                }

                // 設備連線狀態
                let connectStatusTag = new edgeSDK.EdgeDataTag();
                connectStatusTag.deviceId = row.deviceID;
                connectStatusTag.tagName = "connectStatus"; // 以表格欄位名稱當作Datahub tagName
                connectStatusTag.value = 0;
                data.tagList.push(connectStatusTag);

                // 設備最終使用者
                let lastUserTag = new edgeSDK.EdgeDataTag();
                lastUserTag.deviceId = row.deviceID;
                lastUserTag.tagName = "設備最終使用者"; // 以表格欄位名稱當作Datahub tagName
                lastUserTag.value = "Supervisor";
                data.tagList.push(lastUserTag);

                // 設備現在時間
                let nowDateTag = new edgeSDK.EdgeDataTag();
                nowDateTag.deviceId = row.deviceID;
                nowDateTag.tagName = "nowDate"; // 以表格欄位名稱當作Datahub tagName
                nowDateTag.value = new Date().format("yyyy-MM-dd hh:mm:ss");
                data.tagList.push(nowDateTag);
            }

            setTimeout(() => {
                resolve(data);
            }, 2000);
            
        });

        // 取得數據後，透過edgeAgent上傳數據
        getTagsData
            .then((data) => {
                data.ts = Date.now();
                agent.sendData(data);
                console.log(new Date(), "Update device info data successfully");
                // console.log(ipcamList);
            })
            .catch((error) => {
                console.log(error);
            });
    });
}

function sendRecognizingData(result) {
    let getTagsData = new Promise(function (resolve, reject) {
        // let data = { 'cv': new edgeSDK.EdgeData(), 'ac': new edgeSDK.EdgeData() };
        let data = new edgeSDK.EdgeData();

        // 收到觸發事件裝置ID
        // DTag.deviceId = result.deviceID;

        // 模擬觸發事件裝置ID
        let did = ipcamList[getRandomInt(16)];

        /******  新增一筆資料到人員進出紀錄表  ******/
        db.conn.query(
            `INSERT INTO person_attendance_record VALUE ('${result["口罩辨識-事件UUID"]}','${did}','${result["口罩辨識-人員UUID"]}','${result["口罩辨識-觸發時間"]}','${result["口罩辨識-結果"]}','${result["安全帽辨識-結果"]}','${result["背心辨識-結果"]}','${result["體溫"]}','${result["口罩辨識-截圖URL"]}');`,
            function (err, rows, fields) {
                if (err) throw err;
            }
        );
        /*****************************************/

        let sql_worktime = "";

        // 查詢人員基本資料
        let person = new Promise((resolve, reject) => {
            db.conn.query(
                `SELECT * FROM person_profile WHERE pid = '${result["口罩辨識-人員UUID"]}' ;`,
                function (err, rows, fields) {
                    if (err) throw err;

                    // 如果為入口攝影機觸發事件，新增一筆資料到工時紀錄表(離場時間、工時為NULL)
                    if (did.slice(1, 2) == "0") {
                        // rows[0].name 為 單位名稱
                        sql_worktime = `INSERT INTO person_worktime_record 
                            VALUES ('${result["口罩辨識-事件UUID"]}', '${result["口罩辨識-人員UUID"]}', '${result["口罩辨識-觸發時間"]}', NULL, NULL, '${rows[0].unitId}');`;

                        resolve(sql_worktime);
                    }
                    // 出口攝影機辨識事件，更新工時紀錄表中該人員最後一筆紀錄的"離場時間"與"工時"
                    else {

                        // 先查指定人員最新進紀錄UUID與觸發時間
                        let newestUUID = `SELECT a.uuid, DATE_FORMAT(a.triggerTime, '%Y-%m-%d %H:%i:%S') as triggerTime
                            FROM person_attendance_record a 
                            INNER JOIN ( select max(triggerTime) as mt, personID 
                                        from person_attendance_record    
                                        where personID='${result["口罩辨識-人員UUID"]}' and SUBSTR(deviceID,2,1)='0'
                                        group by personID ) m 
                            ON a.triggerTime = m.mt AND a.personID = m.personID`;

                        db.conn.query(newestUUID, function (err, rs, fields) {
                            if (err) throw err;
                            else if (rs.length) {
                                let uuid = rs[0].uuid;
                                let startTime = rs[0].triggerTime;

                                // 根據"進"紀錄uuid查詢紀錄，更新該"離場時間"與"工時"
                                sql_worktime = `UPDATE person_worktime_record
                                                SET endTime='${result["口罩辨識-觸發時間"]}', workTime=TIMESTAMPDIFF(SECOND, '${startTime}', '${result["口罩辨識-觸發時間"]}')
                                                WHERE uuid='${uuid}';`;

                                resolve(sql_worktime);
                            } else {
                                console.log("沒有對應的WorkTime資料，不更新工時紀錄表");
                            }
                        });

                    }
                }
            );
        });

        person
            .then((sql) => {
                db.conn.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    console.log(new Date(), `worktime table operated`);

                    // 門禁統計數據
                    // db.getWorkTime();
                    db.getPersonStatis(edgeAgent);

                });
            })
            .catch((err) => {
                console.log(err);
            });

        // 配置上傳Datahub的Tag及其值
        for (let key in result) {
            let DTag = new edgeSDK.EdgeDataTag();

            if (key.substr(5) == '截圖URL') continue;
            
            DTag.deviceId = did;
            DTag.tagName = key; // 以表格欄位名稱當作Datahub tagName
            if (key == '體溫') DTag.value = parseFloat(result[key]);
            else DTag.value = result[key];
            // data.cv.tagList.push(DTag);
            data.tagList.push(DTag);

        }

        /****************** 門禁系統資料上傳設定(data.ac) ******************/

        // 人員離場,人員進場
        let str = "";
        if (did.slice(1, 2) == "0") str = "進場";
        else str = "離場";

        db.conn.query(
            `SELECT p.pid as '人員${str}-人員UUID', pNum as '人員${str}-人員編號(工號)', cardId as '人員${str}-卡號(人臉特徵值)', p.name as '人員${str}-姓名', suUnitId as '人員${str}-上級單位代碼', unitId as '人員${str}-單位代碼', occupation as '人員${str}-職業', u.name as '人員${str}-單位名稱', p.profileImage as '人員${str}-事件截圖URL'
                        FROM person_profile p
                        JOIN unit u
                        ON p.unitId = u.id
                        WHERE pid = '${result["口罩辨識-人員UUID"]}';`,
            function (err, rs, fields) {
                if (err) throw err;

                for (let key in rs[0]) {
                    let DTag = new edgeSDK.EdgeDataTag();
                    DTag.deviceId = did;
                    DTag.tagName = key; // 以表格欄位名稱當作tagName
                    DTag.value = rs[0][key].toString();
                    data.tagList.push(DTag);
                }

                // 事件ID
                let eventIdTag = new edgeSDK.EdgeDataTag();
                eventIdTag.deviceId = did;
                eventIdTag.tagName = `人員${str}-事件UUID`;
                eventIdTag.value = result["口罩辨識-事件UUID"];
                data.tagList.push(eventIdTag);

                // 觸發時間
                let triggerTimeTag = new edgeSDK.EdgeDataTag();
                triggerTimeTag.deviceId = did;
                triggerTimeTag.tagName = `人員${str}-時間`;
                triggerTimeTag.value = result["口罩辨識-觸發時間"];
                data.tagList.push(triggerTimeTag);

                // 口罩、背心、安全帽截圖URL
                let RimgUrlTag = new edgeSDK.EdgeDataTag();
                RimgUrlTag.deviceId = did;
                RimgUrlTag.tagName = `口罩辨識-截圖URL`;
                RimgUrlTag.value = rs[0][`人員${str}-事件截圖URL`];
                data.tagList.push(RimgUrlTag);
                let VimgUrlTag = new edgeSDK.EdgeDataTag();
                VimgUrlTag.deviceId = did;
                VimgUrlTag.tagName = `背心辨識-截圖URL`;
                VimgUrlTag.value = rs[0][`人員${str}-事件截圖URL`];
                data.tagList.push(VimgUrlTag);
                let HimgUrlTag = new edgeSDK.EdgeDataTag();
                HimgUrlTag.deviceId = did;
                HimgUrlTag.tagName = `安全帽辨識-截圖URL`;
                HimgUrlTag.value = rs[0][`人員${str}-事件截圖URL`];
                data.tagList.push(HimgUrlTag);

                setTimeout(() => {
                    // 結束此Promise，返回所有門禁與人臉識別資料
                    resolve(data);
                }, 500);

            }
        );
        /*************************** (data.ac) ***************************/
    });

    // 取得數據後，透過edgeAgent上傳數據
    getTagsData
        .then((data) => {
            // console.log(data);
            data.ts = Date.now();
            // data.ac.ts = Date.now();
            // edgeAgent_cv.sendData(data);
            edgeAgent.sendData(data);
            console.log(
                "DeviceID:",
                data.tagList[0].deviceId,
                "Update data successfully"
            );

            return true;
        })
        .catch((error) => {
            console.log(error);
            return false;
        });
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    prepareConfig: prepareConfig,
    sendDeviceData: sendDeviceData,
    sendRecognizingData: sendRecognizingData,
    // sendAccessData: sendAccessData,
};

// 將日期轉換成指定格式
Date.prototype.format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        S: this.getMilliseconds(), //毫秒
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(
            RegExp.$1,
            (this.getFullYear() + "").substr(4 - RegExp.$1.length)
        );
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(
                RegExp.$1,
                RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
            );
        }
    }
    return fmt;
};
