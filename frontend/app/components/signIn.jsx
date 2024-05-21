'use client'

import { FcGoogle } from "react-icons/fc";
import { BsTwitterX } from "react-icons/bs";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Link from "next/link";
import { useState } from "react";

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('')

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    

    function handlePasswordMask(type){
      
      if(type === "pass") setShowPassword((state) => !state);
      if(type === "pass-con") setShowPasswordConfirm((state) => !state);
    }
   
    function handleSubmitForm(e){
        e.preventDefault();
        const data = {name, email, password, confirmPassword};

        console.log(data)
        
    }
  return (
    <div className="flex flex-col items-center w-[400px] py-8 px-2 border border-black justify-center min-h-screen">
        {/* top */}
        <div className="flex w-full mb-8 flex-col justify-start items-start space-y-1">
            <h2 className="font-semibold text-3xl">Create an account</h2>
            <p className="text-gray-500">Join our 100% free creative network.</p>
        </div>

        <div className="w-full flex flex-col space-y-2 mb-6">
            <div className="flex justify-center items-center w-full min-h-[50px] border-[2px] border-gray-300 cursor-pointer group hover:bg-gray-100 transition-all duration-300 ease-in-out rounded-md space-x-2">
                <FcGoogle className="text-[24px] group-hover:scale-105 transition-all duration-300 ease-in-out"/>
                <p className="font-semibold">Sign up with Google</p>
            </div>

            <div className="flex justify-center bg-gray-900 items-center w-full min-h-[50px] cursor-pointer group hover:bg-gray-950 transition-all duration-300 ease-in-out rounded-md space-x-2">
                <BsTwitterX className="text-[24px] text-white group-hover:scale-105 transition-all duration-300 ease-in-out"/>
                <p className="text-white font-semibold">Sign up with X</p>
            </div>
        </div>

        <div className="flex items-center w-full mb-4 justify-center space-x-1">
            <div className="flex-grow h-[1px] bg-gray-500"/>
            <p className="uppercase text-gray-500 font-semibold">or</p>
            <div className="flex-grow h-[1px] bg-gray-500"/>
        </div>


        {/* form */}
        <form onSubmit={(e) => handleSubmitForm(e)} className="w-full flex flex-col space-y-8 mb-3" action="">
          <div className="w-full flex flex-col space-y-4">
          <div className="flex w-full space-x-2">
          <div className="flex w-full flex-col space-y-1">
                <label className="font-semibold" htmlFor="name">
                    Name
                </label>
                
                <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full p-2 rounded-md border-[2px] border-gray-400" placeholder="Enter your name" />  
                
           </div>
           <div className="flex w-full flex-col space-y-1">
                <label className="font-semibold" htmlFor="email">
                    Enter
                </label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full p-2 rounded-md border-[2px] border-gray-400" placeholder="Enter your email" />
                
           </div>
          </div>
           <div className="flex w-full flex-col space-y-1">
                <label className="font-semibold" htmlFor="password">
                    Password
                </label>
                    
                <div className="w-full relative">
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} className="w-full p-2 rounded-md border-[2px] border-gray-400" placeholder="Enter your password" />
                    <div className="absolute cursor-pointer top-1/2 -translate-y-1/2 right-3" onClick={() => handlePasswordMask("pass")}>

                    {!showPassword ? <FaEye /> : <FaEyeSlash/>}
                    </div>
                </div>
                
           </div>
           <div className="flex w-full flex-col space-y-1">
                <label className="font-semibold" htmlFor="password">
                    Confirm password
                </label>
                <div className="w-full relative">
                    <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPasswordConfirm ? 'text' : 'password'} className="w-full p-2 rounded-md border-[2px] border-gray-400" placeholder="Enter your password" />
                    <div className="absolute cursor-pointer top-1/2 -translate-y-1/2 right-3" onClick={() => handlePasswordMask("pass-con")}>

                    {!showPasswordConfirm ? <FaEye /> : <FaEyeSlash/>}
                    </div>
                </div>
           </div>
          </div>

           <button type="submit" className="flex justify-center bg-gray-900 border-none text-white font-semibold items-center w-full min-h-[50px] hover:bg-gray-950 transition-all duration-300 ease-in-out rounded-md space-x-2">Sign up</button>
        </form>

        {/* bottom */}

        <p className="text-gray-500 text-xs">Already have an account? <Link className="underline font-bold text-black" href={'/'}>Log in</Link></p>
    </div>
  )
}
