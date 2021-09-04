import { GetStaticPaths, GetStaticProps } from 'next';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi'

import { getPrismicClient } from '../../services/prismic';
import Head from 'next/head'
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Header from '../../components/Header';
import { RichText } from 'prismic-dom';
import Prismic from '@prismicio/client'
import { useRouter } from 'next/router';
import { format } from 'date-fns'
import ptBr from 'date-fns/locale/pt-BR'

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {

  const totalWords = post.data.content.reduce((total, contentItem) => {
    total += contentItem.heading.split(' ').length;

    const words = contentItem.body.map(item =>
      item.text.split(' ').length
    )
    words.map(words => (total += words))
    return total
  }, 0)

  const readTime = Math.ceil(totalWords / 200);

  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>
  }

  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBr
    }
  )

  return (
    <>
      <Head>
        <title>{`Posts | ${post.data.title}`}</title>
      </Head>
      <Header />
      <img src={post.data.banner.url} alt="Banner" className={styles.banner} />
      <main className={styles.container}>
        <div className={styles.posts}>
          <div className={styles.postsTop}>
            <h1>{post.data.title}</h1>
            <ul>
              <li>
                <FiCalendar />
                {formattedDate}
              </li>
              <li>
                <FiUser />
                {post.data.author}
              </li>
              <li>
                <FiClock />
                {`${readTime} Min`}
              </li>
            </ul>
          </div>
          {post.data.content.map((content) => (
            <article key={content.heading}>
              <strong>{content.heading}</strong>
              <div
                className={styles.postContent}
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}
              />
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ]);

  const paths = posts.results.map((post) => {
    return {
      params: {
        slug: post.uid
      }
    }
  })

  console.log(paths);

  return {
    paths,
    fallback: true,
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body]
        }
      })
    }
  }

  // console.log(JSON.stringify(post, null, 2))

  return {
    props: {
      post
    },
    revalidate: 60 * 60 * 24
  }
};
