import { useState, useEffect } from "react";
import Axios from "axios";
import Head from "next/head";
import { Post } from "../types";
import PostCard from "../components/PostCard";
import useSWR from "swr";
// import { GetServerSideProps } from "next";

export default function Home() {
  const { data: posts } = useSWR("/posts");

  return (
    <>
      <Head>
        <title>readit: the front page of the internet</title>
      </Head>
      <div className="container flex pt-4">
        <div className="w-160">
          {posts?.map((post) => (
            <PostCard post={post} key={post.identifier} />
          ))}
        </div>
      </div>
    </>
  );
}

// export const getServerSideProps: GetServerSideProps = async (context) => {
//   try {
//     const res = await Axios.get("/posts");

//     return { props: { posts: res.data } };
//   } catch (error) {
//     return { props: { error: "Something went wrong" } };
//   }
// };
