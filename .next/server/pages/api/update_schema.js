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
exports.id = "pages/api/update_schema";
exports.ids = ["pages/api/update_schema"];
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

/***/ "(api)/./pages/api/update_schema.js":
/*!************************************!*\
  !*** ./pages/api/update_schema.js ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../lib/db */ \"(api)/./lib/db.js\");\n\nasync function handler(req, res) {\n    try {\n        // 检查 comments 表是否存在 author 字段，如果不存在则添加\n        const columns = await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(`\n      SHOW COLUMNS FROM comments LIKE 'author'\n    `);\n        if (columns.length === 0) {\n            // 添加 author 字段\n            await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(`\n        ALTER TABLE comments \n        ADD COLUMN author VARCHAR(255) DEFAULT '匿名' AFTER page_uid\n      `);\n        }\n        // 更新所有页面的默认主题为 matrix\n        // 1. 处理 content 字段中 theme 为 \"default\" 的情况\n        await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(`\n      UPDATE pages \n      SET content = JSON_SET(\n        content, \n        '$.theme', \n        'matrix'\n      )\n      WHERE JSON_EXTRACT(content, '$.theme') = 'default' OR JSON_EXTRACT(content, '$.theme') IS NULL\n    `);\n        // 2. 处理 theme 字段为 \"default\" 的情况（如果有单独的 theme 字段）\n        const themeColumn = await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(`\n      SHOW COLUMNS FROM pages LIKE 'theme'\n    `);\n        if (themeColumn.length > 0) {\n            await (0,_lib_db__WEBPACK_IMPORTED_MODULE_0__.query)(`\n        UPDATE pages \n        SET theme = 'matrix' \n        WHERE theme = 'default' OR theme IS NULL\n      `);\n        }\n        res.status(200).json({\n            message: \"comments表结构更新成功，并且所有默认主题已更新为matrix\"\n        });\n    } catch (error) {\n        res.status(500).json({\n            error: error.message\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwaSkvLi9wYWdlcy9hcGkvdXBkYXRlX3NjaGVtYS5qcy5qcyIsIm1hcHBpbmdzIjoiOzs7OztBQUFxQztBQUV0QixlQUFlQyxPQUFPLENBQUNDLEdBQUcsRUFBRUMsR0FBRyxFQUFFO0lBQzlDLElBQUk7UUFDRix1Q0FBdUM7UUFDdkMsTUFBTUMsT0FBTyxHQUFHLE1BQU1KLDhDQUFLLENBQUMsQ0FBQzs7SUFFN0IsQ0FBQyxDQUFDO1FBRUYsSUFBSUksT0FBTyxDQUFDQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3hCLGVBQWU7WUFDZixNQUFNTCw4Q0FBSyxDQUFDLENBQUM7OztNQUdiLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELHNCQUFzQjtRQUN0QiwwQ0FBMEM7UUFDMUMsTUFBTUEsOENBQUssQ0FBQyxDQUFDOzs7Ozs7OztJQVFiLENBQUMsQ0FBQyxDQUFDO1FBRUgsaURBQWlEO1FBQ2pELE1BQU1NLFdBQVcsR0FBRyxNQUFNTiw4Q0FBSyxDQUFDLENBQUM7O0lBRWpDLENBQUMsQ0FBQztRQUVGLElBQUlNLFdBQVcsQ0FBQ0QsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMxQixNQUFNTCw4Q0FBSyxDQUFDLENBQUM7Ozs7TUFJYixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFREcsR0FBRyxDQUFDSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUNDLElBQUksQ0FBQztZQUNuQkMsT0FBTyxFQUFFLG9DQUFvQztTQUM5QyxDQUFDLENBQUM7SUFDTCxFQUFFLE9BQU9DLEtBQUssRUFBRTtRQUNkUCxHQUFHLENBQUNJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsSUFBSSxDQUFDO1lBQUVFLEtBQUssRUFBRUEsS0FBSyxDQUFDRCxPQUFPO1NBQUUsQ0FBQyxDQUFDO0lBQ2pELENBQUM7QUFDSCxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vd2lzaDIvLi9wYWdlcy9hcGkvdXBkYXRlX3NjaGVtYS5qcz85MGY3Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHF1ZXJ5IH0gZnJvbSAnLi4vLi4vbGliL2RiJztcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihyZXEsIHJlcykge1xuICB0cnkge1xuICAgIC8vIOajgOafpSBjb21tZW50cyDooajmmK/lkKblrZjlnKggYXV0aG9yIOWtl+aute+8jOWmguaenOS4jeWtmOWcqOWImea3u+WKoFxuICAgIGNvbnN0IGNvbHVtbnMgPSBhd2FpdCBxdWVyeShgXG4gICAgICBTSE9XIENPTFVNTlMgRlJPTSBjb21tZW50cyBMSUtFICdhdXRob3InXG4gICAgYCk7XG4gICAgXG4gICAgaWYgKGNvbHVtbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyDmt7vliqAgYXV0aG9yIOWtl+autVxuICAgICAgYXdhaXQgcXVlcnkoYFxuICAgICAgICBBTFRFUiBUQUJMRSBjb21tZW50cyBcbiAgICAgICAgQUREIENPTFVNTiBhdXRob3IgVkFSQ0hBUigyNTUpIERFRkFVTFQgJ+WMv+WQjScgQUZURVIgcGFnZV91aWRcbiAgICAgIGApO1xuICAgIH1cbiAgICBcbiAgICAvLyDmm7TmlrDmiYDmnInpobXpnaLnmoTpu5jorqTkuLvpopjkuLogbWF0cml4XG4gICAgLy8gMS4g5aSE55CGIGNvbnRlbnQg5a2X5q615LitIHRoZW1lIOS4uiBcImRlZmF1bHRcIiDnmoTmg4XlhrVcbiAgICBhd2FpdCBxdWVyeShgXG4gICAgICBVUERBVEUgcGFnZXMgXG4gICAgICBTRVQgY29udGVudCA9IEpTT05fU0VUKFxuICAgICAgICBjb250ZW50LCBcbiAgICAgICAgJyQudGhlbWUnLCBcbiAgICAgICAgJ21hdHJpeCdcbiAgICAgIClcbiAgICAgIFdIRVJFIEpTT05fRVhUUkFDVChjb250ZW50LCAnJC50aGVtZScpID0gJ2RlZmF1bHQnIE9SIEpTT05fRVhUUkFDVChjb250ZW50LCAnJC50aGVtZScpIElTIE5VTExcbiAgICBgKTtcbiAgICBcbiAgICAvLyAyLiDlpITnkIYgdGhlbWUg5a2X5q615Li6IFwiZGVmYXVsdFwiIOeahOaDheWGte+8iOWmguaenOacieWNleeLrOeahCB0aGVtZSDlrZfmrrXvvIlcbiAgICBjb25zdCB0aGVtZUNvbHVtbiA9IGF3YWl0IHF1ZXJ5KGBcbiAgICAgIFNIT1cgQ09MVU1OUyBGUk9NIHBhZ2VzIExJS0UgJ3RoZW1lJ1xuICAgIGApO1xuICAgIFxuICAgIGlmICh0aGVtZUNvbHVtbi5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCBxdWVyeShgXG4gICAgICAgIFVQREFURSBwYWdlcyBcbiAgICAgICAgU0VUIHRoZW1lID0gJ21hdHJpeCcgXG4gICAgICAgIFdIRVJFIHRoZW1lID0gJ2RlZmF1bHQnIE9SIHRoZW1lIElTIE5VTExcbiAgICAgIGApO1xuICAgIH1cbiAgICBcbiAgICByZXMuc3RhdHVzKDIwMCkuanNvbih7IFxuICAgICAgbWVzc2FnZTogJ2NvbW1lbnRz6KGo57uT5p6E5pu05paw5oiQ5Yqf77yM5bm25LiU5omA5pyJ6buY6K6k5Li76aKY5bey5pu05paw5Li6bWF0cml4JyBcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xuICB9XG59Il0sIm5hbWVzIjpbInF1ZXJ5IiwiaGFuZGxlciIsInJlcSIsInJlcyIsImNvbHVtbnMiLCJsZW5ndGgiLCJ0aGVtZUNvbHVtbiIsInN0YXR1cyIsImpzb24iLCJtZXNzYWdlIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(api)/./pages/api/update_schema.js\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../webpack-api-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = (__webpack_exec__("(api)/./pages/api/update_schema.js"));
module.exports = __webpack_exports__;

})();