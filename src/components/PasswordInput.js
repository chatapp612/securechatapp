import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './Home.css';
const PasswordInput = ({ value, onChange }) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    return (
        
        <div className="form__field">
            <input
            className="form__input"
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder="Enter your password"
            />
            <span onClick={toggleVisibility} className="eye-icon">
                {isVisible ? <FaEyeSlash /> : <FaEye />}
            </span>
            </div>
           
       
    );
};

export default PasswordInput;
