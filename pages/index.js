import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();

  // 可以选择自动重定向到管理页面
  // useEffect(() => {
  //   router.push('/admin');
  // }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>祝福卡片系统</title>
        <meta name="description" content="创建和分享个性化祝福卡片" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          欢迎使用祝福卡片系统
        </h1>

        <p className={styles.description}>
          创建和分享个性化祝福卡片
        </p>

        <div className={styles.grid}>
          <a href="/admin" className={styles.card}>
            <h2>管理页面 &rarr;</h2>
            <p>创建和管理您的祝福卡片</p>
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <p>祝福卡片系统 - 让爱传递</p>
      </footer>
    </div>
  );
}