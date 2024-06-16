const express=require('express');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors=require('cors');

//connect db
require('./db/connection')

//Imports files
const Users = require('./modules/Users')

const Conversations =require('./modules/Conversations')

const Messages=require('./modules/Messages')


 const io= require('socket.io')(8080,{
    cors:{
        origin:'http://localhost:3000'
    }
 })
//app Use
const app= express();   
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cors());
const port = process.env.PORT || 8000;


//Socket.io
let users=[];
io.on('connection',socket=>{
    console.log('User connected',socket.id);
    socket.on('addUser',userId=>{
        const isUserExist = users.find(user=>user.userId===userId);
        if(!isUserExist){
            const user ={userId, socketId:socket.id};
            users.push(user);
            io.emit('getUsers',users);
        }
    })
    
    socket.on('sendMessage',async({senderId,receiverId,message,conversationId})=>{
        const receiver = users.find(user=>user.userId===receiverId);
        const sender = users.find(user=>user.userId===senderId);
       const user = await Users.findById(senderId);
        if(receiver){
           io.to(receiver.socketId).to(sender.socketId).emit('getMessage',{
              senderId,
              message,
              conversationId,
              receiverId,
              user:{id:user._id,fullName:user.fullName,email:user.email}
           });
           
        }else {
            io.to(sender.socketId).emit('getMessage', {
                senderId,
                message,
                conversationId,
                receiverId,
                user: { id: user._id, fullName: user.fullName, email: user.email }
            });
        }
    })


    socket.on('disconnect',()=>{
        users=users.filter(user=>user.socketId!=socket.id);
        io.emit('getUsers',users);
    })
})
//routes
app.get('/',(req,res)=>{
    res.send("Welcome");
})

//Registration

app.post('/api/register', async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            console.log("error in form")
            res.status(400).send('Please fill all required fields');
        } else {
            const isAlreadyExist = await Users.findOne({ email });
            if (isAlreadyExist) {
                res.status(400).send('User already exists');
            } else {
                const newUser = new Users({ fullName, email });
                bcryptjs.hash(password, 10, (err, hashedPassword) => {
                    newUser.set('password', hashedPassword);
                    newUser.save();
                    next();
                })
                return res.status(200).send('User registered successfully');
            }
        }

    } catch (error) {
        console.log(error, 'Error')
    }
})

//login
// app.post('/api/login',async(req,res,next)=>{
//     try{
//         const {email,password}=req.body;
//         if(!email || !password){
//             res.status(400).send('please fill all required fields');
//         }else{
//             const user = await Users.findOne({email});
//             if(!user){
//                 res.status(400).send('User email or password is incorrect');
//             }else{
//                 const validateUser=await bcryptjs.compare(password,user.password);
//                 if(!validateUser){
//                     res.status(400).send('User email or password is incorrect');

//                 }
//                 else{
//                   const payload={
//                     userId:user._id,
//                     email:user.email
//                   }
//                   const JWT_SECRET_KEY=process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';
//                   jwt.sign(payload,JWT_SECRET_KEY,{expiresIn:84600},async(err,token)=>{
//                     await Users.updateOne({_id:user._id},{
//                         $set:{token}
//                     })
//                     user.save();
//                     next();
//                   })
//                   res.status(200).json({user:{email:user.email,fullName:user.fullName},token:user.token})
//                 }
//             }
//         }
//     }
//     catch(error){
//         console.log(error,'Error')
//     }
// })
app.post('/api/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).send('Please fill all required fields');
        } else {
            const user = await Users.findOne({ email });
            if (!user) {
                res.status(400).send('User email or password is incorrect');
            } else {
                const validateUser = await bcryptjs.compare(password, user.password);
                if (!validateUser) {
                    res.status(400).send('User email or password is incorrect');
                } else {
                    const payload = {
                        userId: user._id,
                        email: user.email
                    }
                    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';

                    jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: 84600 }, async (err, token) => {
                        await Users.updateOne({ _id: user._id }, {
                            $set: { token }
                        })
                        user.save();
                        return res.status(200).json({ user: { id: user._id, email: user.email, fullName: user.fullName }, token: token })
                    })
                }
            }
        }

    } catch (error) {
        console.log(error, 'Error')
    }
})


// create conversation
app.post('/api/conversation',async(req,res)=>{
    try{
        const {senderId,recieverId}=req.body;
        const newConversation = new Conversations({members:[senderId,recieverId]});
        await newConversation.save();
        res.status(200).send('Conversation created successfully');
    }catch(error){
        console.log(error,'Error')
    }
})
//get conversation
app.get('/api/conversations/:userId',async(req,res)=>{
    try{
        const userId= req.params.userId;
        const conversations=await Conversations.find({members:{$in: [userId]}});
        const conversationUserData=Promise.all(conversations.map(async(conversation)=>{
            const receiverId = conversation.members.find((member)=>member!=userId);
            const user= await Users.findById(receiverId);
            return {user:{receiverId:user._id, email:user.email, fullName:user.fullName},conversationId:conversation._id}
        }))
        res.status(200).json(await conversationUserData);
    }catch(error){
        console.log(error,'Error')
    }
})

//messaging
app.post('/api/message', async (req, res) => {
    try {
        const { conversationId, senderId, message, receiverId = '' } = req.body;
        console.log(conversationId, senderId, message, receiverId)
        if (!senderId || !message) return res.status(400).send('Please fill all required fields')
        if (conversationId === 'new' && receiverId) {
            const newCoversation = new Conversations({ members: [senderId, receiverId] });
            await newCoversation.save();
            const newMessage = new Messages({ conversationId: newCoversation._id, senderId, message });
            await newMessage.save();
            return res.status(200).send('Message sent successfully');
        } else if (!conversationId && !receiverId) {
            return res.status(400).send('Please fill all required fields')
        }
        const newMessage = new Messages({ conversationId, senderId, message });
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.log(error, 'Error')
    }
})

//get the messages
app.get('/api/message/:conversationId', async (req, res) => {
    try {
        const checkMessages = async (conversationId) => {
            console.log(conversationId, 'conversationId')
            const messages = await Messages.find({ conversationId });
            const messageUserData = Promise.all(messages.map(async (message) => {
                const user = await Users.findById(message.senderId);
                return { user: { id: user._id, email: user.email, fullName: user.fullName }, message: message.message }
            }));
            res.status(200).json(await messageUserData);
        }
        const conversationId = req.params.conversationId;
        if (conversationId === 'new') {
            const checkConversation = await Conversations.find({ members: { $all: [req.query.senderId, req.query.receiverId] } });
            if (checkConversation.length > 0) {
                checkMessages(checkConversation[0]._id);
            } else {
                return res.status(200).json([])
            }
        } else {
            checkMessages(conversationId);
        }
    } catch (error) {
        console.log('Error', error)
    }
})


//to get users who dont have any conversation id
app.get('/api/users/:userId',async(req,res)=>{
    try{
        const userId= req.params.userId;
        const users=await Users.find({_id:{$ne:userId}});
        const usersData = Promise.all(users.map(async(user)=>{
            return {user:{email:user.email,fullName:user.fullName,receiverId:user._id}}
        }))
        res.status(200).json(await usersData);
    }catch(error){
        console.log('Error',error);
    }
})

app.listen(port,()=>{
    console.log("listening on port"+port)
})