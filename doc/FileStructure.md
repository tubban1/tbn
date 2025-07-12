/Users/wahaha/Documents/Me/Project/cursor/wish2/
├── .next/                 # Next.js 构建文件
├── .trae/                 # Trae 配置文件
│   └── rules/             # Trae 规则文件
│       └── project_rules.md # 项目规则文档
├── doc/                   # 文档目录
│   ├── DataStructure.md   # 数据结构文档
│   ├── FileStructure.md   # 文件结构文档
│   └── Product.md         # 产品文档
├── lib/                   # 库文件目录
│   └── db.js              # 数据库连接和查询函数
├── package-lock.json      # npm 依赖锁定文件
├── package.json           # 项目配置和依赖
├── pages/                 # Next.js 页面目录
│   ├── admin.js           # 管理页面
│   ├── api/               # API 接口目录
│   │   ├── comments.js    # 评论相关接口
│   │   ├── get_db_structure.js # 获取数据库结构
│   │   ├── init_db.js     # 初始化数据库
│   │   ├── page_views.js  # 页面访问统计
│   │   ├── pages/         # 页面相关接口
│   │   │   ├── [uid].js   # 单个页面操作接口
│   │   │   ├── create.js  # 创建页面接口
│   │   │   └── index.js   # 页面列表接口
│   │   └── update_schema.js # 更新数据库结构
│   ├── e/                 # 编辑页面目录
│   │   └── [uid].js       # 动态路由的编辑页面
│   ├── index.js           # 首页
│   └── w/                 # 祝福展示页面目录
│       └── [uid].js       # 动态路由的祝福展示页面
└── styles/                # 样式文件目录
├── Admin.module.css   # 管理页面样式
├── Edit.module.css    # 编辑页面样式
├── Home.module.css    # 首页样式
├── Wish.module.css.bak # 祝福页面样式备份
├── common.module.css  # 通用样式
├── index.js           # 样式入口文件
├── default/           # 默认主题
│   └── style.module.css # 默认主题样式
├── dreamySky/         # 梦幻天空主题
│   ├── script.js      # 梦幻天空特效脚本
│   └── style.module.css # 梦幻天空样式
├── fairyForest/       # 童话森林主题
│   └── style.module.css # 童话森林样式
├── freshGreen/        # 清新绿色主题
│   └── style.module.css # 清新绿色样式
├── futuristicTech/    # 未来科技主题
│   └── style.module.css # 未来科技样式
├── matrix/            # 黑客帝国主题
│   ├── script.js      # 黑客帝国特效脚本
│   └── style.module.css # 黑客帝国样式
├── minimalBW/         # 极简黑白主题
│   └── style.module.css # 极简黑白样式
├── paperLetter/       # 纸质信件主题
│   ├── script.js      # 纸质信件特效脚本
│   └── style.module.css # 纸质信件样式
├── pixelRetro/        # 像素复古主题
│   └── style.module.css # 像素复古样式
└── travelPostcard/    # 旅行明信片主题
└── style.module.css # 旅行明信片样式


## 主要目录说明

### pages 目录
包含所有页面和API路由，遵循Next.js的文件路由系统：
- `index.js` - 网站首页
- `admin.js` - 管理页面，用于批量创建和管理祝福页面
- `w/[uid].js` - 祝福展示页面，通过动态路由参数uid访问
- `e/[uid].js` - 祝福编辑页面，通过动态路由参数uid访问
- `api/` - 所有后端API接口

### styles 目录
包含所有CSS样式模块和主题：
- 每个主题都有独立的目录
- 部分主题包含特效脚本(script.js)
- 所有主题都有样式模块(style.module.css)

### lib 目录
包含共享库和工具函数：
- `db.js` - 数据库连接和查询函数

### doc 目录
包含项目文档：
- `Product.md` - 产品功能文档
- `DataStructure.md` - 数据结构文档
- `FileStructure.md` - 文件结构文档