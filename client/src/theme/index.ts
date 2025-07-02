import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#161B22',
      paper: '#1F242C',
    },
    text: {
      primary: '#E6EDF3',
    },
    primary: {
      main: '#3A6FD8',
      contrastText: '#ffffff',
    },
    divider: '#3A3F47',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: #161B22;
    }

    ::-webkit-scrollbar-thumb {
      background-color: #3A3F47;
      border-radius: 8px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: #50555C;
    }

    /* Disable label hover for disabled inputs */
    .MuiFormControl-root:hover label.MuiInputLabel-root:not(.Mui-disabled) {
      color: #3A6FD8 !important;
    }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px #1F242C inset !important;
      -webkit-text-fill-color: #ffffff !important;
    }
  `,
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#1F242C',
          color: '#E6EDF3',
          borderRadius: '8px',
          transition: 'border-color 0.2s ease',

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3A3F47',
            transition: 'border-color 0.2s ease',
          },
          '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3A6FD8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3A6FD8',
          },

          '&.Mui-disabled': {
            backgroundColor: '#1A1E25',
            color: '#7c8491',
            pointerEvents: 'none',
          },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: '#4B4F56',
          },
        },
        input: {
          color: '#E6EDF3',
          '&.Mui-disabled': {
            color: '#7c8491',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#A0AAB8',
          '&.Mui-focused': {
            color: '#3A6FD8',
          },
          '&.Mui-disabled': {
            color: '#7c8491',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: '#E6EDF3',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1F242C',
          color: '#E6EDF3',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: 'none',
            boxShadow: 'none',
            border: 'none',
          },
          '&:focus': {
            outline: 'none',
            boxShadow: 'none',
            border: 'none',
          },
        },
      },
    },
  },
});
