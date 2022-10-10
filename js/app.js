/* global OT API_KEY TOKEN SESSION_ID SAMPLE_SERVER_BASE_URL */

var apiKey = "";
var VonageSessionId = "";
var token = "";

function handleError(error) {
    if (error) {
        console.error(error);
    }
}

async function initializeSession() {
    const stream = await OT.getUserMedia({
        videoSource: null
    });

    const {
        Symbl,
        LINEAR16AudioStream
    } = window;

    try {

        // We recommend to remove appId and appSecret authentication for production applications.
        // See authentication section for more details
        const symbl = new Symbl({
            appId: appId,
            appSecret: appSecret,
            // accessToken: '<your Access Token>'
        });

        const sampleRate = stream.getAudioTracks()[0].getSettings().sampleRate;
        const context = new AudioContext({ sampleRate });
        const sourceNode = context.createMediaStreamSource(stream);

        // Creating a new AudioStream
        const audioStream = new LINEAR16AudioStream(sourceNode);

        var connection = null;

        if (sessionId == null | "" | undefined) {
            // Open a Symbl Streaming API WebSocket Connection.
            connection = await symbl.createConnection();
        } else {
            // Subscribe Connection
            connection = await symbl.createConnection(sessionId);
        }

        var connectionOptions = {
            insightTypes: ["question", "action_item", "follow_up"],
            config: {
                encoding: "OPUS" // Encoding can be "LINEAR16" or "OPUS"
            },
            speaker: {
                userId: currentUser,
                name: userName
            }
        };

        var connectVideo = function() {
            var session = OT.initSession(apiKey, VonageSessionId);

            // Subscribe to a newly created stream
            session.on('streamCreated', function streamCreated(event) {
                var subscriberOptions = {
                    insertMode: 'append',
                    width: '100%',
                    height: '100%'
                };
                session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
            });

            session.on('sessionDisconnected', function sessionDisconnected(event) {
                console.log('You were disconnected from the session.', event.reason);
            });

            // initialize the publisher
            var publisherOptions = {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            };
            var publisher = OT.initPublisher('publisher', publisherOptions, handleError);

            // Connect to the session
            session.connect(token, function callback(error) {
                if (error) {
                    handleError(error);
                } else {
                    // If the connection is successful, publish the publisher to the session
                    session.publish(publisher, handleError);
                }
            });
        }

        // Start processing audio from your default input device.
        await connection.startProcessing(connectionOptions, audioStream);

        connection.on('follow_up', () => {
            console.log('I am connected!');
            //connectVideo();
        })

        connection.on("conversation_created", (conversationData) => {
            // Handle conversationData here.
            console.log("Created!" + conversationData.data.conversationId)
            $('#shareableLink').text("https://basicvideochat.web.app?sessionId=" + connection.sessionId);
            //connectVideo();
        });

        // Retrieve real-time transcription from the conversation
        connection.on("speech_recognition", (speechData) => {
            const {
                punctuated
            } = speechData;
            const name = speechData.user ? speechData.user.name : "User";
            console.log(`${name}: `, punctuated.transcript);
            if (speechData.user.userId != currentUser) {
                $('#liveCaptions').text(punctuated.transcript);
            }
        });

        // Retrieve real-time transcription from the conversation
        connection.on("message", (message) => {
            //console.log("Message: ", message[0]["payload"]["content"]);
            if (message[0].from.userId == currentUser) {
                $("#chatBody").append('<div class="message my-message"> <img alt="" class="img-circle medium-image" src="images/user_1.png"> <div class="message-body"> <div class="message-body-inner"> <div class="message-info"> <h4> ' + message[0].from.name + ' </h4> <h5> <i class="fa fa-clock-o"></i> ' + new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }) + ' </h5> </div> <hr> <div class="message-text"> ' + message[0].payload.content + ' </div> </div> </div> <br> </div>');
            } else {
                $("#chatBody").append('<div class="message info"> <img alt="" class="img-circle medium-image" src="images/user_2.png"> <div class="message-body"> <div class="message-body-inner"> <div class="message-info"> <h4> ' + message[0].from.name + ' </h4> <h5> <i class="fa fa-clock-o"></i> ' + new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }) + ' </h5> </div> <hr> <div class="message-text"> ' + message[0].payload.content + ' </div> </div> </div> <br> </div>');
            }
        });

        // Retrieve the topics of the conversation in real-time.
        connection.on("topic", (topicData) => {
            topicData.forEach((topic) => {
                //console.log("Topic: " + topic.phrases);
                $('#topicBody').append('<li data-toggle="tab"> <img alt="" class="img-circle medium-image" src="images/topic.png"> <div class="vcentered info-combo"> <h3 class="no-margin-bottom name"> ' + topic.phrases + ' </h3> </div> <div class="contacts-add"> <span class="message-time"> ' + new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }) + ' </span> </div> </li>');
            });
        });

        // Retrive questions from the conversation in real-time.
        connection.on("question", (questionData) => {
            //console.log("Question Found: ", questionData["payload"]["content"]);
            $('#questionBody').append('<li data-toggle="tab"> <img alt="" class="img-circle medium-image" src="images/topic.png"> <div class="vcentered info-combo"> <h3 class="no-margin-bottom name"> ' + questionData["payload"]["content"] + ' </h3> </div> <div class="contacts-add"> <span class="message-time"> ' + new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }) + ' </span> </div> </li>');

        });

        connectVideo();

        // This is just a helper method meant for testing purposes.
        // Waits 60 seconds before continuing to the next API call.
        //await Symbl.wait(60000);

        // Stops processing audio, but keeps the WebSocket connection open.
        //await connection.stopProcessing();

        // Closes the WebSocket connection.
        //connection.disconnect();
    } catch (e) {
        // Handle errors here.
    }
}

// See the config.js file.
if (API_KEY && TOKEN && SESSION_ID) {
    apiKey = API_KEY;
    VonageSessionId = SESSION_ID;
    token = TOKEN;
    initializeSession();
} else if (SAMPLE_SERVER_BASE_URL) {
    // Make an Ajax request to get the OpenTok API key, session ID, and token from the server
    fetch(SAMPLE_SERVER_BASE_URL + '/session').then(function fetch(res) {
        return res.json();
    }).then(function fetchJson(json) {
        apiKey = json.apiKey;
        VonageSessionId = json.sessionId;
        token = json.token;

        initializeSession();
    }).catch(function catchErr(error) {
        handleError(error);
        alert('Failed to get opentok sessionId and token. Make sure you have updated the config.js file.');
    });
}