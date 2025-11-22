import { Link, Outlet } from "react-router-dom";
import { NavList } from "../../../components";
import ImageComponent from "../../../assets";
import { useParams } from "react-router-dom";
import ChatApp from "./chats/App";
import { AiAssistant } from "./ai-assistant/AiAssistant";
import { useState } from "react";
import { motion } from "framer-motion";
import download from "./download";

export default function SharedNav() {
  const { common_id } = useParams();
  const [showChats, setShowChats] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const tempList2 = (showChats, setShowChats, showAi, setShowAi, common_id) => {
    return ([
      {
        work: "chats",
        child: <ImageComponent className="w-6 h-6" imageName="ChatBubbleImage" alt="Chat" />,
        onClick: () => { setShowChats(!showChats); setShowAi(false); },
        onClose: () => setShowChats(false),
      },
      {
        work: "ai-assistant",
        child: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-black">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        ),
        onClick: () => { setShowAi(!showAi); setShowChats(false); },
        onClose: () => setShowAi(false),
      },
      {
        work: "logs",
        child: <Link to={`/curriculum/${common_id}/versions`}>
          <ImageComponent className="w-6 h-6" imageName="LogsImage" alt="Logs" />
        </Link>,
      },
      {
        work: "users",
        child: <Link to={`/curriculum/${common_id}/users`}>
          <ImageComponent className="w-6 h-6" imageName="PersonAddImage" alt="grant-access" />
        </Link>,
      },
      {
        child: <button
          onClick={() => {
            setDownloading(true)
            download(common_id, "course.pdf").then(() => setDownloading(false))
          }
          }
          disabled={downloading}>
          {
            downloading?
            <div role="status">
              <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-primary-500" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span class="sr-only">Loading...</span>
            </div>
            :
            <ImageComponent className="w-6 h-6" imageName="DownloadImage" alt="download" />
          }
        </button>
      }
    ])
  }

  return (
    <div className="h-full flex flex-col">
      <nav className="flex justify-between w-full">
        <NavList
          list={tempList(common_id)}
          vertical={false}
        />
        <div className="flex gap-2">
          {tempList2(showChats, setShowChats, showAi, setShowAi, common_id).map((item, indx) => {
            return (
              <div
                key={indx}
                className="w-12 h-12 flex justify-center items-center hover:cursor-pointer"
                {...item}
              >
                {item.child}
              </div>)
          })}
        </div>
      </nav>
      <hr className="border-t border-gray-300 mb-4" />
      <main className="w-full relative flex-grow">
        <Outlet />
      </main>
      <motion.div
        className="fixed top-[80px] right-0 h-[86vh] w-[400px] z-50 rounded-l-2xl bg-white border-solid border-8 border-primary-50"
        initial={{
          right: "0px",
        }}
        animate={
          showChats ? {
            right: "0px",
          } : {
            right: "-450px",
          }
        }
      >
        <ChatApp room={common_id} onClose={() => setShowChats(false)} />
      </motion.div>

      <motion.div
        className="fixed top-[80px] right-0 h-[86vh] w-[400px] z-50 rounded-l-2xl bg-white border-solid border-8 border-primary-50"
        initial={{
          right: "-450px",
        }}
        animate={
          showAi ? {
            right: "0px",
          } : {
            right: "-450px",
          }
        }
      >
        <AiAssistant onClose={() => setShowAi(false)} />
      </motion.div>
    </div>
  )
}
const tempList = (common_id) => {
  return ([
    {
      child: "Basic Info",
      to: `/curriculum/${common_id}`,
    }, {
      child: "Categories",
      to: `/curriculum/${common_id}/categories`,
    }, {
      child: "Semester",
      to: `/curriculum/${common_id}/semesters`,
    }, {
      child: "Subjects",
      to: `/curriculum/${common_id}/subjects`,
    }, {
      child: "Feedback",
      to: `/curriculum/${common_id}/feedback`,
    }
  ])
}