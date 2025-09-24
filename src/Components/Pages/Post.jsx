import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaCaretDown, FaChevronRight } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from "framer-motion";
import RelatedBlogs from './RelatedBlogs';
import { ChevronDown, HelpCircle } from 'lucide-react';
import RecentBlogs from './RecentBlogs';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Loading Skeleton Components
const HeroSectionSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
    <div className="lg:w-1/2 space-y-4">
      <div className="h-6 w-32 bg-gray-200 rounded"></div>
      <div className="h-12 w-full bg-gray-200 rounded"></div>
      <div className="h-6 w-48 bg-gray-200 rounded"></div>
      <div className="flex gap-4 mt-4">
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="lg:w-1/2">
      <div className="w-full h-64 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const ContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="h-4 w-full bg-gray-200 rounded" style={{
        width: `${[100, 95, 90, 85, 80, 75, 70, 65][i]}%`
      }}></div>
    ))}
  </div>
);

const TableOfContentsSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 rounded" style={{
        width: `${80 - i * 10}%`
      }}></div>
    ))}
  </div>
);

const TagsSkeleton = () => (
  <div className="flex flex-wrap gap-3 mt-8 animate-pulse">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="h-8 w-20 bg-gray-200 rounded-lg"></div>
    ))}
  </div>
);

const AuthorSkeleton = () => (
  <div className="flex items-center gap-3 animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
    <div className="space-y-2">
      <div className="h-4 w-32 bg-gray-200 rounded"></div>
      <div className="h-3 w-48 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export function HeroSection({ data, view }) {
  const [readingTime, setReadingTime] = useState(null);

  function calcTimeToRead(content) {
    if (!content) return 1;
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordsCount = textContent.split(' ').filter(word => word.length > 0).length;
    const WPM = 200;
    const readingTime = wordsCount / WPM;
    return Math.max(1, Math.ceil(readingTime));
  }

  useEffect(() => {
    if (data?.content) {
      const time = calcTimeToRead(data.content);
      setReadingTime(time);
    }
  }, [data?.content]);

  useEffect(() => {
    if (view && data) {
      const timer = setTimeout(() => {
        const contentElement = document.getElementById('blog-content-container');
        if (contentElement && contentElement.innerText) {
          const wordsCount = contentElement.innerText.split(' ').filter(word => word.length > 0).length;
          const WPM = 200;
          const time = Math.max(1, Math.ceil(wordsCount / WPM));
          setReadingTime(time);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, data]);

  if (!view) return <HeroSectionSkeleton />;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-1/2 font-bold">
        <span className='text-hoverText capitalize'>{data?.category}</span>
        <h1 className='lg:text-[54px] text-3xl font-extrabold lg:leading-[67px]'>{data?.title}</h1>
        <p className='mt-5'>By {data?.author.name}</p>
        <div className="flex gap-2 items-center text-sm font-medium mt-3">
          <p>
            {readingTime !== null ? `${readingTime} minutes read` : 'Calculating...'}
          </p>
          <div className="h-full w-[1px] bg-gray-400"></div>
          <p>Published {formatDate(data?.created_at)}</p>
          <div className="h-full w-[1px] bg-gray-400"></div>
          <p>Updated {formatDate(data?.updated_at)}</p>
        </div>
      </div>
      <div className="lg:w-1/2">
        <div className="flex justify-center">
          <img
            src={data?.cover_photo}
            alt='cover photo'
            className='w-full max-h-[500px] object-contain'
          />
        </div>
      </div>
    </div>
  );
}

export function FAQs({ faqs, isLoading }) {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (id) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-2xl mb-6 mx-auto"></div>
          <div className="h-8 w-64 bg-gray-200 rounded mx-auto mb-4"></div>
          <div className="h-4 w-80 bg-gray-200 rounded mx-auto"></div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!faqs || faqs.length === 0) {
    return (
      <div className="mx-auto p-8">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <HelpCircle className="w-12 h-12 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No FAQs Available</h3>
          <p className="text-gray-500">Check back later for frequently asked questions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
          <HelpCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Find answers to common questions about our services and policies
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openItems.has(faq.id);
          return (
            <div
              key={faq.id}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full px-8 py-6 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 pr-8 group-hover:text-blue-600 transition-colors duration-200">
                    {faq.question}
                  </h3>
                  <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-purple-50 group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </button>

              <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="px-8 pb-6">
                  <div className="w-12 h-px bg-gradient-to-r from-blue-500 to-purple-500 mb-4"></div>
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Post() {
  const { id } = useParams();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [tableOfContent, setTableOfContent] = useState(false);
  const navigate = useNavigate();

  const { data: post, isLoading, isError, error } = useQuery({
    queryKey: [`post-${id}`],
    queryFn: () => {
      return axios.get(`https://api.nexus.com/api/landing/blogs/${id}`);
    },
    retry: false
  });

  const scrollToHeading = (headingId, event) => {
    event.preventDefault();
    const element = document.getElementById(headingId);
    if (element) {
      const navbarHeight = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const contentElement = document.getElementById('blog-content-container');
      if (!contentElement) return;

      const contentRect = contentElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const contentHeight = contentElement.offsetHeight;

      const scrolled = Math.max(0, -contentRect.top);
      const maxScroll = contentHeight - windowHeight + contentRect.top + window.pageYOffset;

      const progress = Math.min(100, Math.max(0, (scrolled / Math.max(1, maxScroll)) * 100));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [post?.data?.data]);

  if (isError) {
    return (
      <div className="container py-20 text-center">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            {error.response?.status === 404 ? 'Post Not Found' : 'Error Loading Post'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error.response?.status === 404
              ? "The blog post you're looking for doesn't exist or may have been removed."
              : "We encountered an error while loading this post. Please try again later."}
          </p>
          <button
            onClick={() => navigate('/blog')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky lg:top-[84px] top-[81px] z-10">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-gray-200">
        <div className="container !py-5 flex flex-wrap items-center gap-3">
          {isLoading ? (
            <>
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
              <FaChevronRight size={10} className="text-gray-400" />
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
              <FaChevronRight size={10} className="text-gray-400" />
              <div className="h-4 w-32 bg-gray-300 rounded"></div>
            </>
          ) : (
            <>
              <span
                className='hover:text-hoverText hover:underline cursor-pointer text-grayText text-opacity-80'
                onClick={() => navigate(`/blog`)}
              >
                Blogs
              </span>
              <FaChevronRight size={10} />
              <span
                className='hover:text-hoverText hover:underline cursor-pointer text-grayText text-opacity-80'
                onClick={() => navigate(`/blog/all-posts`)}
              >
                All posts
              </span>
              <FaChevronRight size={10} />
              <span className='cursor-pointer text-grayText text-opacity-100'>
                {post?.data?.data?.title}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="container flex flex-col gap-5">
        <HeroSection data={post?.data?.data} view={!isLoading} />

        <div className="relative w-full">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Mobile Table of Contents */}
            {isLoading ? (
              <div className="lg:hidden">
                <div className="h-10 w-full bg-gray-200 rounded mb-2"></div>
              </div>
            ) : (
              <div className="lg:hidden">
                <button
                  className="font-semibold text-gray-800 bg-white flex justify-between w-full items-center hover:text-primary"
                  onClick={() => { setTableOfContent(!tableOfContent) }}
                >
                  Table of Contents
                  <FaCaretDown className={`${tableOfContent ? 'rotate-180' : 'rotate-0'} duration-500`} />
                </button>
                <div className="flex flex-col gap-2 max-h-[calc(100vh-150px)] overflow-y-auto">
                  {tableOfContent && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {post?.data?.data?.headings?.map((h, i) => (
                        <button
                          key={i}
                          onClick={(e) => scrollToHeading(h.id, e)}
                          className={`${h.level == 1
                            ? 'ps-0 text-base font-bold text-gray-900 hover:text-hoverText'
                            : h.level == 2
                              ? 'ps-3 text-sm font-semibold text-gray-700 hover:text-hoverText'
                              : 'ps-6 text-sm lg:font-normal font-medium text-gray-500 hover:text-gray-700'
                            } transition-colors duration-200 py-1 block border-l-2 border-transparent hover:border-hoverText pl-2 text-left cursor-pointer bg-transparent border-none`}
                        >
                          {h.text}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="lg:w-3/4 w-full">
              <div className="content-container !mx-0 !ps-0" id='blog-content-container'>
                {isLoading ? (
                  <ContentSkeleton />
                ) : (
                  <div
                    className="content"
                    dangerouslySetInnerHTML={{ __html: post?.data?.data?.content || '' }}
                  />
                )}
              </div>

              {isLoading ? (
                <TagsSkeleton />
              ) : (
                <div className="flex flex-wrap gap-3 mt-8">
                  {post?.data?.data?.tags?.map((t, index) => (
                    <div key={index} className="border rounded-lg py-1 px-2 text-sm">
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table of Contents */}
            {isLoading ? (
              <div className="w-1/4 lg:block hidden">
                <TableOfContentsSkeleton />
              </div>
            ) : (
              post?.data?.data?.headings?.length > 0 && (
                <div className="w-1/4 lg:block hidden">
                  <div className="sticky top-[84px]">
                    <div className="flex flex-col gap-2 max-h-[calc(100vh-150px)] overflow-y-auto">
                      <h4 className="font-semibold text-gray-800 mb-2 sticky top-0 bg-white pt-5 pb-2">
                        Table of Contents
                      </h4>
                      {post?.data?.data?.headings?.map((h, i) => (
                        <button
                          key={i}
                          onClick={(e) => scrollToHeading(h.id, e)}
                          className={`${h.level == 1
                            ? 'ps-0 text-base font-bold text-gray-900 hover:text-hoverText'
                            : h.level == 2
                              ? 'ps-3 text-sm font-semibold text-gray-700 hover:text-hoverText'
                              : 'ps-6 text-sm lg:font-normal font-medium text-gray-500 hover:text-gray-700'
                            } transition-colors duration-200 py-1 block border-l-2 border-transparent hover:border-hoverText pl-2 text-left cursor-pointer bg-transparent border-none`}
                        >
                          {h.text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="w-full h-[1px] bg-gray-300 mt-10"></div>
            <AuthorSkeleton />
          </>
        ) : (
          <>
            <div className="w-full h-[1px] bg-gray-300 mt-10"></div>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 aspect-square rounded-full overflow-hidden">
                    <img
                      src={post?.data?.data?.author?.profile_photo}
                      alt={post?.data?.data?.author?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className='font-extrabold'>{post?.data?.data?.author?.name}</h3>
                </div>
                <p className='text-xs'>{post?.data?.data?.author?.bio}</p>
              </div>
            </div>
          </>
        )}

        <FAQs faqs={post?.data?.data?.faqs} isLoading={isLoading} />
        {!isLoading && post?.data?.data?.id && <RelatedBlogs id={post?.data?.data?.id} title={'Related blogs'} />}
        {!isLoading && post?.data?.data?.id && <RecentBlogs id={post?.data?.data?.id} title={'Recent blogs'} />}
      </div>
    </>
  );
}