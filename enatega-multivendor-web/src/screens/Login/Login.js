import React, { useCallback, useEffect, useState } from "react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
} from "@react-oauth/google";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import ConfigurableValues from "../../config/constants";
import { Link as RouterLink } from "react-router-dom";
import { useLocation } from "react-router";
import GoogleIcon from "../../assets/icons/GoogleIcon";
import FlashMessage from "../../components/FlashMessage";
import useRegistration from "../../hooks/useRegistration";
import { LoginWrapper } from "../Wrapper";
import useStyles from "./styles";
import { useTranslation } from 'react-i18next';

function Login() {
  const { GOOGLE_CLIENT_ID } = ConfigurableValues();
  const { t } = useTranslation();
  const theme = useTheme();
  const [mainError, setMainError] = useState({});
  const classes = useStyles();
  const {
    goolgeSuccess,
    authenticationFailure,
    loginError,
  } = useRegistration();
  const location = useLocation();

  const showMessage = useCallback((messageObj) => {
    setMainError(messageObj);
  }, []);

  useEffect(() => {
    if (loginError) {
      showMessage({
        type: "error",
        message: loginError,
      });
    }
  }, [loginError, showMessage]); // Added showMessage to the dependency array

  const toggleSnackbar = useCallback(() => {
    setMainError({});
  }, []);

  return (
    <LoginWrapper>
      <FlashMessage
        open={Boolean(mainError.type)}
        severity={mainError.type}
        alertMessage={mainError.message}
        handleClose={toggleSnackbar}
      />
      <Typography variant="h5" className={classes.font700}>
        {t('welcome')}
      </Typography>

      <Typography
        variant="caption"
        className={`${classes.caption} ${classes.fontSubHead} ${classes.font700} `}
      >
        {t('signUpOrLogin')}
      </Typography>
      {GOOGLE_CLIENT_ID ? (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <GoogleLogin
            onSuccess={goolgeSuccess}
            onError={authenticationFailure}
            useOneTap={false}
            width="400"
          />
        </GoogleOAuthProvider>
      ) : (
        <Button
          variant="contained"
          fullWidth
          disabled
          startIcon={<GoogleIcon />}
          className={`${classes.gButton} ${classes.btnBase}`}
        >
          <Typography variant="caption">
            {t('signInWithGoogle')}
          </Typography>
        </Button>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "80%",
            display: "flex",
            alignSelf: "center",
            justifyContent: "space-around",
            alignItems: "center",
            margin: theme.spacing(2, 0),
          }}
        >
          <div className={classes.line}></div>
          <Typography
            variant="caption"
            className={`${classes.fontGrey} ${classes.caption} ${classes.font700} `}
          >
            {t('or')}
          </Typography>
          <div className={classes.line}></div>
        </div>
      </Box>
      <RouterLink
        to="/new-login"
        state={{ from: location.state?.from }}
        style={{ textDecoration: "none" }}
      >
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disableElevation
          disableRipple
          disableFocusRipple
          disableTouchRipple
          className={`${classes.btnBase} ${classes.customBtn}`}
        >
          <Typography
            variant="caption"
            color="secondary"
            className={`${classes.font700} ${classes.caption}`}
          >
            {t('continueWithEmail')}
          </Typography>
        </Button>
      </RouterLink>
 
      <Box
        display="flex"
        sx={{ justifyContent: "center", alignItems: "center" }}
        flexWrap="wrap"
        mt={theme.spacing(3)}
      >
        <Typography
          style={{
            width: "80%",
          }}
          variant="caption"
          className={`${classes.fontGrey} ${classes.caption} `}
        >
          {t('bySigningUp')}
          <RouterLink to="/terms" style={{ textDecoration: "none" }}>
            <Typography
              variant="caption"
              color="primary"
              className={`${classes.font700} ${classes.caption}`}
            >
              {t('terms')}
            </Typography>
          </RouterLink>
          {t('and')}
          <RouterLink to="/privacy" style={{ textDecoration: "none" }}>
            <Typography
              variant="caption"
              color="primary"
              className={`${classes.font700} ${classes.caption}`}
            >
              {t('privacyPolicy')}
            </Typography>
          </RouterLink>
        </Typography>
      </Box>
    </LoginWrapper>
  );
}

export default Login;
