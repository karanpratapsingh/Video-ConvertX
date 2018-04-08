const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell } = electron;
const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');

let mainWindow;

app.on('ready', () => {

    if (process.platform === 'darwin') {

        mainWindow = new BrowserWindow({
            height: 600,
            width: 880,
            webPreferences: { backgroundThrottling: false },
            titleBarStyle: 'hidden',
            darkTheme: true,
            resizable: false
        });


    } else {

        mainWindow = new BrowserWindow({
            height: 600,
            width: 880,
            icon: 'src/assets/windows-icon@2x.png',
            webPreferences: { backgroundThrottling: false },
            frame: false,
            darkTheme: true,
            resizable: false
        });
    }


    mainWindow.loadURL(`file://${__dirname}/src/index.html`);
});

ipcMain.on('videos:added', (event, videos) => {

    const promises = _.map(videos, video => {

        return new Promise((resolve, reject) => {

            ffmpeg.ffprobe(video.path, (error, metadata) => {

                video.duration = metadata.format.duration;
                video.format = 'avi';

                resolve(video);
            });
        });
    });

    Promise.all(promises)
        .then(results => {

            mainWindow.webContents.send('metadata:complete', results);
        });
});

ipcMain.on('conversion:start', (event, videos) => {

    _.each(videos, video => {


        const outputDirectory = video.path.split(video.name)[0];
        const outputName = video.name.split('.')[0];
        const outputPath = `${outputDirectory}${outputName}.${video.format}`;

        ffmpeg(video.path)
            .output(outputPath)
            .on('progress', ({ timemark }) => {

                mainWindow.webContents.send('conversion:progress', { video, timemark });
            }).on('end', () => {

                mainWindow.webContents.send('conversion:end', { video, outputPath });
            }).run();
    });
});

ipcMain.on('folder:open', (event, outputPath) => {

    shell.showItemInFolder(outputPath);
});


ipcMain.on('app:minimize', () => {

    mainWindow.minimize();
});

ipcMain.on('app:fullscreen', () => {



    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});

ipcMain.on('app:close', () => {

    app.quit();
});

