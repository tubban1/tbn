/Users/wahaha/Documents/Me/Project/cursor/wish2/
├── .next/                 # Next.js 构建文件
├── .trae/                 # Trae 配置文件
├── doc/                   # 文档目录
│   ├── DataStructure.md   # 数据结构文档
│   ├── Product.md         # 产品文档
│   └── Requirements.md    # 需求文档
├── package-lock.json      # npm 依赖锁定文件
├── package.json           # 项目配置和依赖
├── pages/                 # Next.js 页面目录
│   ├── admin.js           # 管理页面
│   ├── api/               # API 接口目录
│   ├── e/                 # 编辑页面目录
│   ├── index.js           # 首页
│   └── w/                 # 祝福展示页面目录
└── styles/                # 样式文件目录
    ├── Admin.module.css   # 管理页面样式
    ├── Edit.module.css    # 编辑页面样式
    ├── Home.module.css    # 首页样式
    ├── Wish.module.css.bak # 祝福页面样式备份
    ├── common.module.css  # 通用样式
    ├── index.js           # 样式入口文件
    └── 多个主题目录/       # 各种主题样式目录


pages/
├── admin.js               # 管理页面
├── api/                   # API 接口目录
│   ├── comments/          # 评论相关接口
│   ├── get_db_structure.js # 获取数据库结构
│   ├── init_db.js         # 初始化数据库
│   ├── page_views.js      # 页面访问统计
│   ├── pages/             # 页面相关接口
│   └── update_schema.js   # 更新数据库结构
├── e/                     # 编辑页面目录
│   └── [uid].js           # 动态路由的编辑页面
├── index.js               # 首页
└── w/                     # 祝福展示页面目录
    └── [uid].js           # 动态路由的祝福展示页面


styles/
├── Admin.module.css       # 管理页面样式
├── Edit.module.css        # 编辑页面样式
├── Home.module.css        # 首页样式
├── Wish.module.css.bak    # 祝福页面样式备份
├── common.module.css      # 通用样式
├── index.js               # 样式入口文件
├── default/               # 默认主题
├── dreamySky/             # 梦幻天空主题
├── fairyForest/           # 童话森林主题
├── freshGreen/            # 清新绿色主题
├── futuristicTech/        # 未来科技主题
├── matrix/                # 黑客帝国主题
│   ├── matrixEffects.js   # 黑客帝国特效
│   └── matrixTheme.module.css # 黑客帝国样式
├── minimalBW/             # 极简黑白主题
├── paperLetter/           # 纸质信件主题
├── pixelRetro/            # 像素复古主题
└── travelPostcard/        # 旅行明信片主题     