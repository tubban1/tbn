"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/api/page_views";
exports.ids = ["pages/api/page_views"];
exports.modules = {

/***/ "serverless-mysql":
/*!***********************************!*\
  !*** external "serverless-mysql" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("serverless-mysql");

/***/ }),

/***/ "(api)/./lib/db.js":
/*!*******************!*\
  !*** ./lib/db.js ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"query\": () => (/* binding */ query)\n/* harmony export */ });\n/* harmony import */ var serverless_mysql__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! serverless-mysql */ \"serverless-mysql\");\n/* harmony import */ var serverless_mysql__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(serverless_mysql__WEBPACK_IMPORTED_MODULE_0__);\n\nconst db = serverless_mysql__WEBPACK_IMPORTED_MODULE_0___default()({\n    config: {\n        host: process.env.MYSQL_HOST,\n        port: process.env.MYSQL_PORT,\n        database: process.env.MYSQL_DATABASE,\n        user: process.env.MYSQL_USER,\n        password: process.env.MYSQL_PASSWORD\n    }\n});\nasync function query(q, values) {\n    try {\n        const results = await db.query(q, values);\n        await db.end();\n        return results;\n    } catch (error) {\n        throw error;\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9saWIvZGIuanMuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQXFDO0FBRXJDLE1BQU1DLEVBQUUsR0FBR0QsdURBQUssQ0FBQztJQUNmRSxNQUFNLEVBQUU7UUFDTkMsSUFBSSxFQUFFQyxPQUFPLENBQUNDLEdBQUcsQ0FBQ0MsVUFBVTtRQUM1QkMsSUFBSSxFQUFFSCxPQUFPLENBQUNDLEdBQUcsQ0FBQ0csVUFBVTtRQUM1QkMsUUFBUSxFQUFFTCxPQUFPLENBQUNDLEdBQUcsQ0FBQ0ssY0FBYztRQUNwQ0MsSUFBSSxFQUFFUCxPQUFPLENBQUNDLEdBQUcsQ0FBQ08sVUFBVTtRQUM1QkMsUUFBUSxFQUFFVCxPQUFPLENBQUNDLEdBQUcsQ0FBQ1MsY0FBYztLQUNyQztDQUNGLENBQUM7QUFFSyxlQUFlQyxLQUFLLENBQUNDLENBQUMsRUFBRUMsTUFBTSxFQUFFO0lBQ3JDLElBQUk7UUFDRixNQUFNQyxPQUFPLEdBQUcsTUFBTWpCLEVBQUUsQ0FBQ2MsS0FBSyxDQUFDQyxDQUFDLEVBQUVDLE1BQU0sQ0FBQztRQUN6QyxNQUFNaEIsRUFBRSxDQUFDa0IsR0FBRyxFQUFFLENBQUM7UUFDZixPQUFPRCxPQUFPLENBQUM7SUFDakIsRUFBRSxPQUFPRSxLQUFLLEVBQUU7UUFDZCxNQUFNQSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3dpc2gyLy4vbGliL2RiLmpzPzNkYzkiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IG15c3FsIGZyb20gJ3NlcnZlcmxlc3MtbXlzcWwnO1xuXG5jb25zdCBkYiA9IG15c3FsKHtcbiAgY29uZmlnOiB7XG4gICAgaG9zdDogcHJvY2Vzcy5lbnYuTVlTUUxfSE9TVCxcbiAgICBwb3J0OiBwcm9jZXNzLmVudi5NWVNRTF9QT1JULFxuICAgIGRhdGFiYXNlOiBwcm9jZXNzLmVudi5NWVNRTF9EQVRBQkFTRSxcbiAgICB1c2VyOiBwcm9jZXNzLmVudi5NWVNRTF9VU0VSLFxuICAgIHBhc3N3b3JkOiBwcm9jZXNzLmVudi5NWVNRTF9QQVNTV09SRFxuICB9XG59KTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHF1ZXJ5KHEsIHZhbHVlcykge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBkYi5xdWVyeShxLCB2YWx1ZXMpO1xuICAgIGF3YWl0IGRiLmVuZCgpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG59Il0sIm5hbWVzIjpbIm15c3FsIiwiZGIiLCJjb25maWciLCJob3N0IiwicHJvY2VzcyIsImVudiIsIk1ZU1FMX0hPU1QiLCJwb3J0IiwiTVlTUUxfUE9SVCIsImRhdGFiYXNlIiwiTVlTUUxfREFUQUJBU0UiLCJ1c2VyIiwiTVlTUUxfVVNFUiIsInBhc3N3b3JkIiwiTVlTUUxfUEFTU1dPUkQiLCJxdWVyeSIsInEiLCJ2YWx1ZXMiLCJyZXN1bHRzIiwiZW5kIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./lib/db.js\n");

/***/ }),

/***/ "(api)/./pages/api/page_views.js":
/*!*********************************!*\
  !*** ./pages/api/page_views.js ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../lib/db */ \"(api)/./lib/db.js\");\n\nasync function handler(req, res) {\n    if (req.method !== \"POST\") {\n        return res.status(405).json({\n            error: \"方法不允许\"\n        });\n    }\n    const { page_uid  } = req.body;\n    if (!page_uid) {\n        return res.status(400).json({\n            error: \"缺少页面ID\"\n        });\n    }\n    try {\n        // 获取客户端IP和UA\n        const ip_address = req.headers[\"x-forwarded-for\"] || req.connection.remoteAddress;\n        const user_agent = req.headers[\"user-agent\"];\n        // 记录访问\n        await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(\"INSERT INTO page_views (page_uid, ip_address, user_agent) VALUES (?, ?, ?)\", [\n            page_uid,\n            ip_address,\n            user_agent\n        ]);\n        res.status(200).json({\n            success: true\n        });\n    } catch (error) {\n        console.error(\"记录访问失败:\", error);\n        res.status(500).json({\n            error: \"记录访问失败\"\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvcGFnZV92aWV3cy5qcy5qcyIsIm1hcHBpbmdzIjoiOzs7OztBQUFxQztBQUV0QixlQUFlQyxPQUFPLENBQUNDLEdBQUcsRUFBRUMsR0FBRyxFQUFFO0lBQzlDLElBQUlELEdBQUcsQ0FBQ0UsTUFBTSxLQUFLLE1BQU0sRUFBRTtRQUN6QixPQUFPRCxHQUFHLENBQUNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDO1lBQUVDLEtBQUssRUFBRSxPQUFPO1NBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxNQUFNLEVBQUVDLFFBQVEsR0FBRSxHQUFHTixHQUFHLENBQUNPLElBQUk7SUFFN0IsSUFBSSxDQUFDRCxRQUFRLEVBQUU7UUFDYixPQUFPTCxHQUFHLENBQUNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDO1lBQUVDLEtBQUssRUFBRSxRQUFRO1NBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxJQUFJO1FBQ0YsYUFBYTtRQUNiLE1BQU1HLFVBQVUsR0FBR1IsR0FBRyxDQUFDUyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFDOUJULEdBQUcsQ0FBQ1UsVUFBVSxDQUFDQyxhQUFhO1FBQy9DLE1BQU1DLFVBQVUsR0FBR1osR0FBRyxDQUFDUyxPQUFPLENBQUMsWUFBWSxDQUFDO1FBRTVDLE9BQU87UUFDUCxNQUFNWCw4Q0FBSyxDQUNULDRFQUE0RSxFQUM1RTtZQUFDUSxRQUFRO1lBQUVFLFVBQVU7WUFBRUksVUFBVTtTQUFDLENBQ25DLENBQUM7UUFFRlgsR0FBRyxDQUFDRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUNDLElBQUksQ0FBQztZQUFFUyxPQUFPLEVBQUUsSUFBSTtTQUFFLENBQUMsQ0FBQztJQUMxQyxFQUFFLE9BQU9SLEtBQUssRUFBRTtRQUNkUyxPQUFPLENBQUNULEtBQUssQ0FBQyxTQUFTLEVBQUVBLEtBQUssQ0FBQyxDQUFDO1FBQ2hDSixHQUFHLENBQUNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDO1lBQUVDLEtBQUssRUFBRSxRQUFRO1NBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd2lzaDIvLi9wYWdlcy9hcGkvcGFnZV92aWV3cy5qcz8zODhiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHF1ZXJ5IH0gZnJvbSAnLi4vLi4vbGliL2RiJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXEsIHJlcykge1xuICBpZiAocmVxLm1ldGhvZCAhPT0gJ1BPU1QnKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA1KS5qc29uKHsgZXJyb3I6ICfmlrnms5XkuI3lhYHorrgnIH0pO1xuICB9XG5cbiAgY29uc3QgeyBwYWdlX3VpZCB9ID0gcmVxLmJvZHk7XG4gIFxuICBpZiAoIXBhZ2VfdWlkKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgZXJyb3I6ICfnvLrlsJHpobXpnaJJRCcgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIOiOt+WPluWuouaIt+err0lQ5ZKMVUFcbiAgICBjb25zdCBpcF9hZGRyZXNzID0gcmVxLmhlYWRlcnNbJ3gtZm9yd2FyZGVkLWZvciddIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICByZXEuY29ubmVjdGlvbi5yZW1vdGVBZGRyZXNzO1xuICAgIGNvbnN0IHVzZXJfYWdlbnQgPSByZXEuaGVhZGVyc1sndXNlci1hZ2VudCddO1xuICAgIFxuICAgIC8vIOiusOW9leiuv+mXrlxuICAgIGF3YWl0IHF1ZXJ5KFxuICAgICAgJ0lOU0VSVCBJTlRPIHBhZ2Vfdmlld3MgKHBhZ2VfdWlkLCBpcF9hZGRyZXNzLCB1c2VyX2FnZW50KSBWQUxVRVMgKD8sID8sID8pJyxcbiAgICAgIFtwYWdlX3VpZCwgaXBfYWRkcmVzcywgdXNlcl9hZ2VudF1cbiAgICApO1xuICAgIFxuICAgIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCforrDlvZXorr/pl67lpLHotKU6JywgZXJyb3IpO1xuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICforrDlvZXorr/pl67lpLHotKUnIH0pO1xuICB9XG59Il0sIm5hbWVzIjpbInF1ZXJ5IiwiaGFuZGxlciIsInJlcSIsInJlcyIsIm1ldGhvZCIsInN0YXR1cyIsImpzb24iLCJlcnJvciIsInBhZ2VfdWlkIiwiYm9keSIsImlwX2FkZHJlc3MiLCJoZWFkZXJzIiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJ1c2VyX2FnZW50Iiwic3VjY2VzcyIsImNvbnNvbGUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./pages/api/page_views.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/page_views.js"));
module.exports = __webpack_exports__;

})();