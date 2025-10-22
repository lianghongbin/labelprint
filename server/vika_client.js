const axios = require('axios');

class VikaClient {
    constructor(datasheetId, viewId = null) {
        this.token = "uskI2CEJkCSNZNU2KArVUTU";
        this.datasheetId = datasheetId;
        this.viewId = viewId;
        this.baseUrl = `https://api.vika.cn/fusion/v1/datasheets/${datasheetId}/records`;
        this.attachmentUrl = `https://api.vika.cn/fusion/v1/datasheets/${datasheetId}/attachments`;
    }

    _headers(isJson = true) {
        const headers = {
            "Authorization": `Bearer ${this.token}`,
        };
        if (isJson) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }

    async addRecord(fields) {
        const fieldsMapped = this.translateFields(fields, "en2zh");
        const payload = {
            "records": [{"fields": fieldsMapped}],
            "fieldKey": "name",
        };
        
        const response = await axios.post(this.baseUrl, payload, {
            headers: this._headers(),
            timeout: 10000
        });
        return response.data;
    }

    async updateRecord(recordId, fields, convert = 'zh2en') {
        // 判断字段名是否已经是中文
        const firstKey = Object.keys(fields)[0] || "";
        const isChinese = /[\u4e00-\u9fff]/.test(firstKey);
        
        let fieldsMapped;
        if (isChinese || !convert) {
            fieldsMapped = fields; // 已是中文，不映射
        } else {
            fieldsMapped = this.translateFields(fields, convert);
        }

        const payload = {
            "records": [{"recordId": recordId, "fields": fieldsMapped}],
            "fieldKey": "name"
        };

        const response = await axios.patch(this.baseUrl, payload, {
            headers: this._headers(),
            timeout: 10000
        });
        return response.data;
    }

    async queryRecords(params = null) {
        // 默认参数
        const q = {"fieldKey": "name"};
        if (this.viewId) {
            q["viewId"] = this.viewId;
        }
        if (params) {
            Object.assign(q, params);
        }

        try {
            const response = await axios.get(this.baseUrl, {
                headers: this._headers(),
                params: q,
                timeout: 15000
            });

            const data = response.data;
            if (!response.data.success) {
                return {
                    "success": false,
                    "code": data.code || response.status,
                    "message": data.message,
                    "data": data.data,
                    "total": 0
                };
            }

            // 做schema映射
            const records = [];
            for (const rec of data.data.records || []) {
                const fields = rec.fields || {};
                const mapped = this.translateFields(fields);
                mapped["recordId"] = rec.recordId;
                records.push(mapped);
            }

            return {
                "success": true,
                "code": 200,
                "message": "ok",
                "data": records,
                "total": data.data.total
            };
        } catch (error) {
            return {
                "success": false,
                "code": error.response?.status || 500,
                "message": "Invalid JSON from Vika",
                "data": null,
                "total": 0
            };
        }
    }

    // 字段映射配置
    getFieldMaps() {
        return {
            "dst0SSLLF0l2Y4dHcw": {  // 标签打印表
                "oldLabel": "旧标签",
                "newLabel": "新标签", 
                "changeCount": "换标数量",
                "productName": "产品名称",
                "productDescription": "产品描述",
                "labelGroup": "标签组"
            }
        };
    }

    translateFields(fields, direction = "zh2en") {
        const fieldMaps = this.getFieldMaps();
        const fmap = fieldMaps[this.datasheetId];

        if (!fmap) {
            throw new Error(`[translateFields] 未配置 datasheet 映射: ${this.datasheetId}`);
        }

        // 方向选择
        let mapping;
        if (direction === "zh2en") {
            mapping = Object.fromEntries(Object.entries(fmap).map(([en, zh]) => [zh, en]));
        } else if (direction === "en2zh") {
            mapping = fmap;
        } else {
            throw new Error(`非法 direction: ${direction}`);
        }

        const out = {};
        for (const [srcKey, value] of Object.entries(fields || {})) {
            const targetKey = mapping[srcKey] || srcKey;
            out[targetKey] = value;
        }

        return out;
    }
}

module.exports = VikaClient;
