import React, { useEffect } from "react";
import { useRef } from "react";
import Avatar from "../../assets/avatar.jpeg";
import Input from "../../components/Input";
import { useState } from "react";
import Img1 from "../../assets/avatar.jpeg";
import {io} from 'socket.io-client'
const Dashboard = () => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user:detail"))
  );
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [users, setUsers] = useState([]);
  const [socket,setSocket]=useState(null)
  const messageRef = useRef(null);
  
  console.log(messages,'messages');
  useEffect(()=>{
    setSocket(io('http://localhost:8080'))
  },[])

  useEffect(()=>{
    socket?.emit('addUser',user?.id);
    socket?.on('getUsers',users=>{
      console.log('activesUsers:>>',users);
    })
    socket?.on('getMessage',data=>{
      console.log('data:>>',data);
      setMessages(prev=>({
        ...prev,
        messages:[...prev.messages,{user: data.user,message: data.message}]
      }))
    })
  },[socket])
  // console.log(user)
  // console.log(conversations);
  console.log(users);

  useEffect(()=>{
    messageRef?.current?.scrollIntoView({behavior:'smooth'})
  },[messages?.messages])
  useEffect(() => {
    const loggedInUser = JSON.parse(localStorage.getItem("user:detail"));
    const fetchConversations = async () => {
      const res = await fetch(
        `http://localhost:8000/api/conversations/${loggedInUser.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const resData = await res.json();
      // console.log('resData:>>',resData);
      setConversations(resData);
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch(`http://localhost:8000/api/users/${user?.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const resData = await res.json();
      setUsers(resData);
    };
    fetchUsers();
  }, []);

  const fetchMessages = async (conversationId, receiver) => {
    const res = await fetch(
      `http://localhost:8000/api/message/${conversationId}?senderId=${user?.id}&&receiverId=${receiver?.receiverId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    const resData = await res.json();
    // console.log('resData neww:>>',resData);
    setMessages({ messages: resData, receiver, conversationId });
  };

  const sendMessage = async (e) => {
    socket?.emit('sendMessage',{
      senderId:user?.id,
      receiverId:messages?.receiver?.receiverId,
      message,
      convesrsationId:messages?.conversationId
    })
    const res = await fetch(`http://localhost:8000/api/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: messages?.conversationId,
        senderId: user?.id,
        message,
        receiverId: messages?.receiver?.receiverId,
      }),
    });
    setMessage('');
  };

  return (
    <div>
      <div className="w-screen flex flex-wrap justify-between">
        <div className="w-[25%] border border-black h-screen bg-secondary overflow-scroll">
          <div className="flex justify-center items-center my-8">
            <div className="border border-primary p-[2px] rounded-lg">
              {" "}
              <img src={Avatar} width={75} height={75} alt="" />{" "}
            </div>
            <div className="ml-8">
              <h3 className="text-2xl">{user.fullName}</h3>
              <p className="text-lg font-light">My Account</p>
            </div>
          </div>
          <hr className="mt-5" />
          <div className="ml-8 mt-10">
            <div className="text-primary text-lg">Messages</div>
            <div>
              {conversations.length > 0 ? (
                conversations.map(({ conversationId, user }) => {
                  return (
                    <div className="flex items-center py-8 border-b border-b-gray-400">
                      <div
                        className="cursor-pointer flex items-center"
                        onClick={() => fetchMessages(conversationId, user)}
                      >
                        <div className="border border-primary p-[2px] rounded-lg">
                          {" "}
                          <img src={Img1} width={50} height={50} alt="" />{" "}
                        </div>
                        <div className="ml-6">
                          <h3 className="text-xl font-semibold">
                            {user?.fullName}
                          </h3>
                          <p className="text-sm font-light text-gray-400">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-lg font-semibold mt-24">
                  No Conversations
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-[50%] border border-black h-screen bg-white flex flex-col items-center">
          {messages?.receiver?.fullName && (
            <div className="w-[75%] bg-secondary h-[60px] mt-5 rounded-full flex items-center px-14 py-2 ">
              <div className="cursor pointer">
                <img src={Avatar} width={60} height={60} alt="" />
              </div>
              <div className="ml-5 mr-auto">
                <h3 className="text-lg">{messages?.receiver?.fullName}</h3>
                <p className="text-sm font-light text-gray-600">
                  {messages?.receiver?.email}
                </p>
              </div>
              <div className="cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-phone-outgoing"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="black"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />
                  <path d="M15 9l5 -5" />
                  <path d="M16 4l4 0l0 4" />
                </svg>
              </div>
            </div>
          )}

          <div className="h-[70%]  w-full overflow-scroll shadow">
            <div className="p-14">
              {messages?.messages?.length > 0 ? (
                messages.messages.map(({ message, user: { id } = {} }) => {
                  return (
                    <>
                    <div
                      className={`max-w-[40%] rounded-b-xl p-4 mb-6 ${
                        id === user?.id
                          ? "bg-primary text-white rounded-tl-xl ml-auto"
                          : "bg-secondary rounded-tr-xl"
                      }`}
                    >
                      {message}
                    </div>
                    <div ref={messageRef}></div>
                    </>
                  );
                })
              ) : (
                <div className="text-center pt-14 text-2xl">
                  No Conversation Selected
                </div>
              )}
            </div>
          </div>
          {
            <div className="p-10 w-full flex items-center">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-[75%]"
                inputClassName="p-4 border-0 rounded-full shadow-md bg-light focus:ring-0 focus:border-0 outline-none"
              />
              <div
                className={`ml-4 p-4 cursor-pointer bg-light rounded-full ${
                  !message && "pointer-events-none"
                }`}
                onClick={() => sendMessage()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-send"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="#2c3e50"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M10 14l11 -11" />
                  <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
                </svg>
              </div>
              <div className="cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon icon-tabler icon-tabler-library-photo"
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="#2c3e50"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path d="M7 3m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" />
                  <path d="M4.012 7.26a2.005 2.005 0 0 0 -1.012 1.737v10c0 1.1 .9 2 2 2h10c.75 0 1.158 -.385 1.5 -1" />
                  <path d="M17 7h.01" />
                  <path d="M7 13l3.644 -3.644a1.21 1.21 0 0 1 1.712 0l3.644 3.644" />
                  <path d="M15 12l1.644 -1.644a1.21 1.21 0 0 1 1.712 0l2.644 2.644" />
                </svg>
              </div>
            </div>
          }
        </div>

        <div className="w-[25%] border border-black h-screen bg-light px-8 py-16 overflow-scroll">
          <div className="text-primary text-lg">People</div>
          <div>
            {users.length > 0 ? (
              users.map(({ userID, user }) => {
                return (
                  <div className="flex items-center py-8 border-b border-b-gray-400">
                    <div
                      className="cursor-pointer flex items-center"
                      onClick={() => fetchMessages('new', user)}
                    >
                      <div className="border border-primary p-[2px] rounded-lg">
                        {" "}
                        <img src={Img1} width={50} height={50} alt="" />{" "}
                      </div>
                      <div className="ml-6">
                        <h3 className="text-xl font-semibold">
                          {user?.fullName}
                        </h3>
                        <p className="text-sm font-light text-gray-400">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-lg font-semibold mt-24">
                No Conversations
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
