import { gql, useMutation } from "@apollo/client";
import { useCallback, useContext, useState } from "react";
import { login } from "../apollo/server";
import UserContext from "../context/User";
import Analytics from "../utils/analytics";

const LOGIN = gql`
  ${login}
`;

function useRegistration() {
  const { setTokenAsync } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [login, setLogin] = useState(false);
  const [loginButton, loginButtonSetter] = useState(null);
  const [Login] = useMutation(LOGIN, { onCompleted, onError });

  const toggleSnackbar = useCallback(() => {
    setLoginError("");
    setLogin(false);
  }, []);

  async function onCompleted({ login }) {
    try {
      if (login.isNewUser) {
        await Analytics.identify(
          {
            userId: login.userId,
            name: login.name,
            email: login.email,
          },
          login.userId
        );
        await Analytics.track(Analytics.events.USER_CREATED_ACCOUNT, {
          userId: login.userId,
          name: login.name,
          email: login.email,
        });
      } else {
        await Analytics.identify(
          {
            userId: login.userId,
            name: login.name,
            email: login.email,
          },
          login.userId
        );
        await Analytics.track(Analytics.events.USER_LOGGED_IN, {
          userId: login.userId,
          name: login.name,
          email: login.email,
        });
      }
      setLogin(true);
      await setTokenAsync(login.token);
    } catch (e) {
      setLoginError("Something went wrong");
      console.log("Error While saving token:", e);
    } finally {
      setLoading(false);
    }
  }

  function onError(errors) {
    setLoading(false);
    setLoginError(errors.message || "Invalid credentials!");
  }

  const authenticationFailure = useCallback((response) => {
    console.log("Authentication Failed: ", response);
    setLoading(false);
    loginButtonSetter(null);
    setLoginError("Something went wrong");
  }, []);

  const mutateLogin = useCallback(
    async (user) => {
      Login({
        variables: {
          ...user,
        },
      });
    },
    [Login]
  );

  const goolgeSuccess = useCallback(
    (response) => {
      if (!response.credential) {
        authenticationFailure();
        return;
      }
      mutateLogin({
        type: "google",
        googleIdToken: response.credential,
      });
    },
    [authenticationFailure, mutateLogin]
  );

  return {
    loading,
    setLoading,
    loginButton,
    loginButtonSetter,
    mutateLogin,
    goolgeSuccess,
    authenticationFailure,
    setLoginError,
    loginError,
    login,
    toggleSnackbar,
  };
}

export default useRegistration;
