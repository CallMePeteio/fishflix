


import { postData } from './func.js';


const USERNAME_TAG = document.getElementById("username");
const PASSWORD_TAG = document.getElementById("password");



const URL = "https://ip.duerfyringsvakt.com";
const SPECIAL_CHARS = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "{", "}", "[", "]", "|", "\\", "/", ":", ";", "\"", "<", ">", ",", ".", "?"];
const MIN_CRED_LENGTH = 5;



const containsSpecialChar = (string, SPECIAL_CHARS) => {
    for (let char of SPECIAL_CHARS){
        if (string.includes(char)){
            console.log(char);  
            return true;
        }
    }
    return false;
}

const handleLogin = async (event) => {
    event.preventDefault() // PREVENT THE FORM FROM SUBMITTING
    let password = PASSWORD_TAG.value;
    let username = USERNAME_TAG.value;

    if (password.length >= MIN_CRED_LENGTH && username.length >= MIN_CRED_LENGTH){ // CHECKS IF PASSWORD AND USERNAME IS BIGGER THAN MIN LENGTH
        if (!(containsSpecialChar(password, SPECIAL_CHARS)) && !(containsSpecialChar(username, SPECIAL_CHARS))){ // CHECKS IF USERNAME AND PASSWORD DOES NOT CONTAIN SPECIAL CHARACHTER
            const res = await postData(URL + '/users/login', {"username": username, "password": password}); // SENDS A POST REQUEST TO THE BACKEND SERVER

            if (res["message"] == "Login successful"){
                console.log("Loggged in!");
                localStorage.setItem('token', res.token); // STORES THE JWT TOKENS 
                window.location.href = URL + "/home";
            }else {
                console.log("Error logging in");
            }
        } else {
            console.log("password cant contain special charachters");
        }
    } else {
        console.log("Password to short");
    }
    
}



// Add event listener for DOMContentLoaded to ensure the DOM is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelector('.login-form').addEventListener('submit', handleLogin);
});







