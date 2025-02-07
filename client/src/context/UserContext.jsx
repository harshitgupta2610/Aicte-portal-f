import { useContext, useReducer, useEffect, createContext } from "react";
import reducer from "./UserReducer";
import axios from "axios";

import {
  HANDLE_LOADING,
  SETUP_USER,
  ALERT,
  REMOVE_USER,
  SET_NOTIFICATION,
  SET_LAST_SEEN_NOTIFICATION_ID,
  DELETE_NOTIFICATIONS,
  ADD_NOTIFICATIONS,
} from "./UserAction";

const initialState = {
  loading: true,
  user: null,
  notifications: [],
  lastSeenNotification: new Date("1979"),
};

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const base_url = process.env.REACT_APP_URL;
  const axiosInstance = axios.create({
    baseURL: base_url + "/api/v1/",
    withCredentials: true,
  });

  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (err) => {
      if (err.response.status >= 401) {
        // logoutUser();
      }
      err.message = err.response?.data?.message;
      return Promise.reject(err);
    }
  );

  const getCurrUser = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/auth/verify-token", {
        withCredentials: true,
      });

      dispatch({
        type: SETUP_USER,
        payload: res.data,
      });
    } catch (err) {
      logout();
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(false);
    getCurrUser();
    // eslint-disable-next-line
  }, []);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `auth/login/`,
        { email, password },
        { withCredentials: true }
      );

      dispatch({
        type: SETUP_USER,
        payload: response.data,
      });
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: err.message,
      });
    } finally {
      setLoading(false);
    }
  };
  const sendAdminOTP = async ({ email }) => {
    setLoading(true);
    try {
      if (!email || email === "") {
        throw new Error("Enter Valid email");
      }
      await axiosInstance.post("auth/send-otp", { email });
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: "Cannot send OTP at the moment Sorry for the inconvenience",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminOTPAndRegister = async ({ name, password, email, otp }) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post(
        "/auth/register-admin",
        {
          name,
          email,
          password,
          otp,
        },
        { withCredentials: true }
      );

      dispatch({
        type: SETUP_USER,
        payload: res.data,
      });
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: "Error while verifying OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  const registerDev = async ({ name, password, email }) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post(
        "/auth/register-user",
        {
          name,
          email,
          password,
        },
        { withCredentials: true }
      );

      dispatch({
        type: SETUP_USER,
        payload: res.data,
      });
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: "Error in register",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (user) => {
    setLoading(true);
    try {
      await axiosInstance.patch("/users/", user, { withCredentials: true });

      dispatch({
        type: ALERT,
        payload: "refresh to update user",
      });
    } catch (err) {
      console.log(err);
      dispatch({
        type: ALERT,
        payload: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    try {
      await axiosInstance.patch("/auth/update-password", {
        currentPassword,
        newPassword,
      });

      await logout();
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async ({ name, email, role }) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post("auth/register-user", {
        name,
        email,
        role,
      });
      if (response.status !== 200) {
        dispatch({
          type: ALERT,
          payload: "Cannot create User",
        });
        return;
      }
      return {
        userId: response.data.data._id,
        userName: response.data.data.password,
      };
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: "Invalid Credentials",
      });
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await axiosInstance.post(
        "auth/logout",
        {},
        {
          withCredentials: true,
        }
      );
      dispatch({
        type: REMOVE_USER,
      });
    } catch (err) {
      dispatch({
        type: ALERT,
        payload: `Logout fail! server Respoded with ${err.status}`,
      });
    }
    setLoading(false);
  };

  const setLoading = (value) => {
    if (!value) value = false;
    dispatch({
      type: HANDLE_LOADING,
      payload: value,
    });
  };

  const getAllNotifications = async () => {
    if (!state.user) return;
    try {
      const res = await axiosInstance.get("/notification");
      dispatch({
        type: SET_NOTIFICATION,
        payload: res.data.data,
      });
    } catch (err) {
      console.log("cannot get all notifications\n", err);
      window.alert(err.message);
    }
  };

  const removeNotificationLocally = (id) => {
    dispatch({
      type: DELETE_NOTIFICATIONS,
      payload: id,
    });
  };
  const addNotificationLocally = (newNotification) => {
    dispatch({
      type: ADD_NOTIFICATIONS,
      payload: newNotification,
    });
  };

  const setLastSeenNotification = (date) => {
    localStorage.setItem("lastNotification", date);
    dispatch({
      type: SET_LAST_SEEN_NOTIFICATION_ID,
      payload: date,
    });
  };

  useEffect(() => {
    setLastSeenNotification(
      localStorage.getItem("lastNotification") || new Date("1979")
    );
  }, []);

  return (
    <UserContext.Provider
      value={{
        ...state,
        setLoading,
        login,
        sendAdminOTP,
        updatePassword,
        verifyAdminOTPAndRegister,
        registerDev,
        logout,
        createUser,
        updateUserProfile,
        getCurrUser,
        getAllNotifications,
        removeNotificationLocally,
        addNotificationLocally,
        setLastSeenNotification,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => useContext(UserContext);
