import React, { useReducer, useContext } from "react";

import {
    // HANDLE_COURSE_CHANGE,
    // HANDLE_SUBJECT_CHANGE,
    GET_COURSE,
    GET_ALL_SUBJECTS,
} from "./CourseAction";

import reducer from "./CourseReducer";
import axios from "axios";
import { useUserContext } from "./UserContext";

const intialCourse = {};
const courseContext = React.createContext();

export const CourseProvider = ({children})=>{
    const [state, dispatch] = useReducer(reducer, intialCourse);
    const { setLoading } = useUserContext();

    const base_url = process.env.REACT_APP_URL
    const axiosInstance = axios.create({
        baseURL: base_url+"/api/v1/",
        withCredentials:true
    });

    axiosInstance.interceptors.response.use(
        (response)=>{
            return response;
        }, (err)=>{
            if(err.response.status >= 401){
                // logoutUser();
            }
            err.message = err.response?.data?.message
            return Promise.reject(err);
        }
    )

    const getCourse = async (courseId)=>{
        if(!courseId || courseId==="") return undefined;
        const url = `courses/${courseId}`;
        let response = undefined;
        try {
            response = await axiosInstance.get(url);
            if(response.status === 200) {
                dispatch({
                    type: GET_COURSE,
                    payload: {course: response?.data?.data}
                });
            }
        } catch(err) {
            // Handle Error
            console.log("ERROR while executing getCourse() in CourseContext.jsx\n", err);
        }
        return response.data;
    }

    const getCategoriesWiseSub = async(courseId)=>{
        let res = null;
        try{
            const url = `courses/${courseId}/categories`;
            res = await axiosInstance.get(url);
            if(res.status !== 200) {
                alert(res.data?.message);
                return null;
            }
            return res.data
        } catch(err) {
            alert(err.response?.data?.message || err.message);
            return null;
        }
    }

    const getAllSubjects = async (courseId)=>{
        let res = null;
        try{
            const url = `courses/${courseId}/subjects`;
            res = await axiosInstance.get(url);
            
            if(res.status !== 200) {
                res = null;
            }

            dispatch({
                type:GET_ALL_SUBJECTS,
                payload:res.data.data
            })
        } catch(err) {
            alert(err.response?.data?.message || err.message);
        }
        return res;
    }

    const getSemestersWiseSub = async (courseId)=>{
        let res = null;
        try{
            const url = `courses/${courseId}/semesters`;
            res = await axiosInstance.get(url);
            if(res.status !== 200) {
                alert(res.data?.message);
                res = null;
            }
        } catch(err) {
            alert(err.response?.data?.message || err.message);
        }
        return (!res || !res?.data)? res : res.data;
    }

    const updateProperty = async (name, value, courseId)=>{
        let res = null;
        const url = `courses/${courseId}/update-by-user`
        try {
            res = await axiosInstance.patch(url, {
                prop: name,
                data: value,
            })
        } catch(err) {
            res = null;
            alert(err.response?.data?.message || err.message);
            console.log(err);
        }
        return res;
    }

    const addProperty = async (name, value, courseId)=>{
        let res = null;
        try {
            if(!name || !value || !value.cur || !courseId) 
                throw new Error("BAD REQUEST. Please pass all the data!");

            const url = `/courses/${courseId}/update-by-user`;

            // const res2 = await axiosInstance.post("/subjects", value?.cur)

            // value.cur.common_id = res2.data?.data?.common_id;
            // value.cur.version = res2.data?.data?.version;

            res = await axiosInstance.patch(url, {
                isnew: true,
                prop: name,
                data: value?.cur, 
            });
        } catch(err) {
            res = null;
            console.log(err); 
            alert(err.response?.data?.message || err.message); 
        }
        return res;
    }

    const deleteProperty = async(prop, index, courseId)=>{
        const url = `courses/${courseId}/update-by-user`;
        let res = undefined;
        try {
            if(!prop || index===undefined || !courseId) 
                throw new Error("Please provide all data!");

            res = await axiosInstance.patch(url, {
                prop: `${prop}.${index}`,  
                del: true
            });
            await getCourse(state?.common_id);
        } catch(err) {
            res = null;
            alert(err.response?.data?.message || err.message);
            console.log(err);
        }
        return res;
    }

    const acceptChanges = async (propertyName, index, isNew=false, del=false, title)=>{
        const url = `courses/${state.common_id}/accept-updates`;
        let res = undefined;
        try { 
            if(!propertyName || index===undefined || !state.common_id) 
                throw new Error("Cannot make request!");
            
            setLoading(true);

            res = await axiosInstance.patch(url, {
                prop: propertyName,
                index,
                isnew: isNew,
                del, 
                title,
            });

            if(!res || res.status !== 200) throw new Error("Something went wrong!");

            await getCourse(state?.common_id);
        } catch(err) {
            res = null;
            alert(err.response?.data?.message || err.message);
            console.log(err);
        }
        setLoading(false);
        return res;
    }

    return (
        <courseContext.Provider
            value={{
                ...state,
                updateProperty,
                getCourse,
                getCategoriesWiseSub,
                getSemestersWiseSub,
                getAllSubjects,
                addProperty, 
                deleteProperty, 
                acceptChanges, 
            }}
        >
            {children}
        </courseContext.Provider>
    )
}

export const useCourseContext = ()=> useContext(courseContext);