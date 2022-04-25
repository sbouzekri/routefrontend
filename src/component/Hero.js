import React, { useRef, useState } from 'react'
import 'react-dropzone-uploader/dist/styles.css'
import Axios from "axios";
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import { Box, Button, Container, LinearProgress, TextField } from '@material-ui/core';
import { io } from "socket.io-client";
import download from 'downloadjs';
import { API_ENDPOINT_HTTP, API_ENDPOINT_WS } from '../constant/endpoints';

const useStyles = makeStyles((theme) => ({
  cont: {
    padding: theme.spacing(4),
  },
  root: {
    flexGrow: 1,
    padding: theme.spacing(5),
  },
  paper: {
    padding: theme.spacing(2),
    margin: 'auto',
    maxWidth: 1200,
    minHeight: 200
  },
  image: {
    width: 128,
    height: 128,
  },
  img: {
    margin: 'auto',
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  title: {
    paddingRight: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1),
    textAlign: 'left'
  },
  dropbody: {
    padding: theme.spacing(4),
    height: 200
  }
}));

export default function Hero() {
  const classes = useStyles();

  const fileInput = useRef(null)
  const [ inputFile, setInputFile ] = useState(null)
  const [ mainAddr, setMainAddr ] = useState('')
  const [ fileId, setFileId ] = useState('')
  const [ calculating, setCalculating ] = useState(false)
  const [ calculationProgress, setCalculationProgress ] = useState(0)
  const [ outputFile, setOutputFile ] = useState(null)
  const [ speaker, setSpeaker  ] = useState('')
  const [ uploading, setUploading ] = useState(false)
  const [ uploadProgress, setUploadProgress ] = useState(0)
  const [ calculatingMessage, setCalculatingMessage ] = useState('')

  const uploadFile = async (event) => {
    try {
      if (!fileInput.current && (!fileInput.current.files || fileInput.current.files.length === 0)) {
        setSpeaker('No files to upload')
        return
      }

      const formData = new FormData();
      formData.append('xlsx_payload', inputFile)
      setUploading(true)

      const response = await Axios.post(`${API_ENDPOINT_HTTP}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          const progress = progressEvent.loaded / progressEvent.total
          setUploadProgress(Math.round(Math.ceil(progress * 100)))
        }
      })
      setUploading(false)

      if (response.status === 200) {
        setFileId(response.data.fileId)
      }
    } catch (error) {
      setUploading(false)
      setSpeaker('Unable to upload file due to an error')
      setTimeout(() => {
        setSpeaker('')
      }, 3000);
    }
  }

  const calculateRoutes = (event) => {

    const socket = io(API_ENDPOINT_WS, {
      path: '/calc/progress',
      transports: ["websocket"]
    })

    socket.on('connect_failed', function(err){
      console.log('Connection Failed');
      console.log(err)
    });

    socket.on("connect", () => {
      console.log('Connected with Socket ID', socket.id);
      setCalculating(true)
    });

    socket.emit("start-calc", fileId, mainAddr);

    socket.on('progress', ({ fileId, status, progress, message }) => {
      setCalculatingMessage(message)
      setCalculationProgress(Math.round(Math.ceil(progress * 100)))
    });

    socket.on('calc-complete', (fileOut) => {
      setOutputFile(fileOut.outputFileId)
      setCalculating(false)
      setCalculationProgress(0)
      setCalculatingMessage('')
    });

    socket.on('calc-errored', (resp) => {
      setOutputFile(null)
      setCalculating(false)
      setCalculationProgress(0)
      setFileId('')
      setMainAddr('')
      setSpeaker('Encountered an error while calculating. Is the file correct?')
      setTimeout(() => {
        setSpeaker('')
      }, 5000);
    })
  }

  const downloadTargetFile = async (event) => {
    if (!outputFile) {
      setSpeaker('Nothing to download')
      return
    }

    const response = await Axios.post(`${API_ENDPOINT_HTTP}/download`, {
      fileId: outputFile
    }, {
      responseType: 'blob'
    })

    if (response.status === 200) {
      download(response.data, 'output.xlsx');
    }
  }

  const addInputFile = (event) => {
    const file = fileInput.current.files[0];
    setInputFile(file)
  }

  const changeInputValue = (event) => {
    setMainAddr(event.target.value)
  }

  const reset = (event) => {
    setCalculating(false)
    setInputFile(null)
    setFileId('')
    setMainAddr('')
    setOutputFile(null)
    setCalculationProgress(0)
    setSpeaker('')
  }

  return (
    <Container >
      <div className={classes.root}>
        <Paper className={classes.paper}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm container>
              <Grid item xs={12} className={classes.title}>
                <Typography gutterBottom variant="h4">
                  Upload XLSX & Calculate
                </Typography>
              </Grid>
              <Grid item xs={12} className={classes.dropbody}>
                {(() => {
                  if (fileId === '') {
                    if (uploading) {
                      return (
                        <>
                          <Typography variant="body1" gutterBottom>
                            Uploading {inputFile.name || ''}...
                          </Typography>
                          <LinearProgress variant="determinate" value={uploadProgress} />
                        </>
                      )
                    } else {
                      return (
                        <form>
                          <input ref={fileInput} type="file" id="xlsx_payload" name="xlsx_payload" onInput={addInputFile} accept=".xls,.xlsx" />
                        </form>
                      )
                    }
                  } else if (fileId && fileId !== '' && !outputFile) {
                    if (calculating) {
                      return (
                        <>
                          <Typography variant="body1" gutterBottom>
                            Calculating Route Legs; {calculatingMessage}
                          </Typography>
                          <LinearProgress variant="determinate" value={calculationProgress} />
                        </>
                      )
                    } else {
                      return (
                        <>
                          <Typography variant="body1" gutterBottom>
                            File {inputFile.name || ''} uploaded. Calculate Routes?
                          </Typography>

                          <Box mb={2}>
                            <TextField  id="main-address-filed" label="Main Address" variant="standard" size="medium" onChange={changeInputValue} />
                          </Box>
                          <Button variant="contained" color="primary" onClick={calculateRoutes}>
                            Calculate
                          </Button>
                          <Box component="span" ml={1}>
                            <Button variant="contained" color="secondary" onClick={reset}>
                              Cancel
                            </Button>
                          </Box>
                        </>
                      )
                    }
                  } else if (!calculating && outputFile) {
                    return (
                      <>
                        <Typography variant="body2" gutterBottom>
                          Calculation completed. You can download the output XLSX file below!
                        </Typography>
                        <Button variant="contained" color="primary" onClick={reset}>
                          Upload Another
                        </Button>
                      </>
                    )
                  }
                })()
                }
              </Grid>
              <Grid item xs={3}>
                <Button variant="contained" color="primary" disabled={!Boolean(inputFile) || Boolean(outputFile) || Boolean(calculating)} onClick={uploadFile}>
                  Upload
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Box fontWeight="fontWeightBold">
                  { speaker }
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Button variant="contained" color="secondary" disabled={!Boolean(!calculating && outputFile)} onClick={downloadTargetFile}>
                  Download
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </div>
    </Container>
  );
}
