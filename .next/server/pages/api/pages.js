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
exports.id = "pages/api/pages";
exports.ids = ["pages/api/pages"];
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

/***/ "(api)/./pages/api/pages/index.js":
/*!**********************************!*\
  !*** ./pages/api/pages/index.js ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../lib/db */ \"(api)/./lib/db.js\");\n\nasync function handler(req, res) {\n    if (req.method !== \"GET\") {\n        return res.status(405).json({\n            error: \"方法不允许\"\n        });\n    }\n    try {\n        const rows = await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(\"SELECT * FROM pages ORDER BY created_at DESC\");\n        res.status(200).json(rows);\n    } catch (error) {\n        console.error(\"获取页面失败:\", error);\n        res.status(500).json({\n            error: \"获取页面失败\"\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvcGFnZXMvaW5kZXguanMuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBd0M7QUFFekIsZUFBZUMsT0FBTyxDQUFDQyxHQUFHLEVBQUVDLEdBQUcsRUFBRTtJQUM5QyxJQUFJRCxHQUFHLENBQUNFLE1BQU0sS0FBSyxLQUFLLEVBQUU7UUFDeEIsT0FBT0QsR0FBRyxDQUFDRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUNDLElBQUksQ0FBQztZQUFFQyxLQUFLLEVBQUUsT0FBTztTQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRUQsSUFBSTtRQUNGLE1BQU1DLElBQUksR0FBRyxNQUFNUiw4Q0FBSyxDQUFDLDhDQUE4QyxDQUFDO1FBQ3hFRyxHQUFHLENBQUNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDRSxJQUFJLENBQUMsQ0FBQztJQUM3QixFQUFFLE9BQU9ELEtBQUssRUFBRTtRQUNkRSxPQUFPLENBQUNGLEtBQUssQ0FBQyxTQUFTLEVBQUVBLEtBQUssQ0FBQyxDQUFDO1FBQ2hDSixHQUFHLENBQUNFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDO1lBQUVDLEtBQUssRUFBRSxRQUFRO1NBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7QUFDSCxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd2lzaDIvLi9wYWdlcy9hcGkvcGFnZXMvaW5kZXguanM/NDkyMSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBxdWVyeSB9IGZyb20gJy4uLy4uLy4uL2xpYi9kYic7XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIocmVxLCByZXMpIHtcbiAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKSB7XG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA1KS5qc29uKHsgZXJyb3I6ICfmlrnms5XkuI3lhYHorrgnIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgcXVlcnkoJ1NFTEVDVCAqIEZST00gcGFnZXMgT1JERVIgQlkgY3JlYXRlZF9hdCBERVNDJyk7XG4gICAgcmVzLnN0YXR1cygyMDApLmpzb24ocm93cyk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcign6I635Y+W6aG16Z2i5aSx6LSlOicsIGVycm9yKTtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAn6I635Y+W6aG16Z2i5aSx6LSlJyB9KTtcbiAgfVxufSJdLCJuYW1lcyI6WyJxdWVyeSIsImhhbmRsZXIiLCJyZXEiLCJyZXMiLCJtZXRob2QiLCJzdGF0dXMiLCJqc29uIiwiZXJyb3IiLCJyb3dzIiwiY29uc29sZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(api)/./pages/api/pages/index.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/pages/index.js"));
module.exports = __webpack_exports__;

})();