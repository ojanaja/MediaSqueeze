import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import React, { useRef, useState } from 'react';
import { Colors } from '../constants/Colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Feather } from '@expo/vector-icons';
import Fonts from '../constants/Fonts';
import ActionSheet from 'react-native-actions-sheet';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Image as ImageCompressor, Audio as AudioCompressor } from 'react-native-compressor';

const HomeScreen = () => {
    const actionSheetRef = useRef();
    const [selectedImage, setSelectedImage] = useState(null);
    const [recording, setRecording] = useState();
    const [recordings, setRecordings] = React.useState([]);
    const [compressingAudio, setCompressingAudio] = useState(false);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [recordingStopped, setRecordingStopped] = useState(false);
    console.info(selectedImage);

    async function startRecording() {
        try {
            if (permissionResponse.status !== 'granted') {
                console.log('Requesting permission..');
                await requestPermission();
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    function getRecordingLines() {
        return recordings.map((recordingLine, index) => {
            return (
                <View key={index} style={styles.row}>
                    <Text style={styles.uploadText}>
                        Recording #{index + 1} | {recordingLine.duration}
                    </Text>
                    <View style={styles.playDeleteContainer}>
                        <TouchableOpacity style={styles.compressButton} onPress={() => recordingLine.sound.replayAsync()}>
                            <Text style={styles.compressButtonText}>Play</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.compressButton} onPress={() => clearRecordings()}>
                            <Text style={styles.compressButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        });
    }

    function getDurationFormatted(milliseconds) {
        const minutes = milliseconds / 1000 / 60;
        const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
        return seconds < 10 ? `${Math.floor(minutes)}:0${seconds}` : `${Math.floor(minutes)}:${seconds}`
    }

    function clearRecordings() {
        setRecordings([])
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        setRecording(undefined);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
        const { sound, status } = await recording.createNewLoadedSoundAsync();
        let allRecordings = [...recordings];
        allRecordings.push({
            sound: sound,
            duration: getDurationFormatted(status.durationMillis),
            file: recording.getURI()
        });
        setRecordings(allRecordings);
        console.log('Recording stopped and stored at', recording.getURI());
        setCompressingAudio(false);
        setRecordingStopped(true);
    }


    const openActionSheet = () => {
        actionSheetRef.current?.show();
    };

    const closeActionSheet = () => {
        actionSheetRef.current?.hide();
    };

    const pickImageAsync = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        } else {
            alert('You did not select any image.');
        }
    }

    function ImageViewer({ placeholderImageSource, selectedImage }) {
        const imageSource = selectedImage ? { uri: selectedImage } : placeholderImageSource;

        return <Image source={imageSource} style={styles.image} />;
    }

    const handleAudioUpload = () => {
        setSelectedImage(null);
        setCompressingAudio(true);
        closeActionSheet();
    };

    const handleCompressNow = async () => {
        if (selectedImage) {
            // Compress image
            const compressedImageUri = await compressImage(selectedImage);
            setSelectedImage(compressedImageUri); // Update state with compressed image URI
            console.log('Image compressed successfully!');
        } else if (recordings.length > 0) {
            // Compress audio
            await compressAudio(recordings);
            setCompressingAudio(false); // Update state after compression is finished
            console.log('Audio compressed successfully!');
        } else {
            console.log('No media selected for compression');
        }
    };

    const compressImage = async (imageUri) => {
        try {
            const options = {
                quality: 0.8, // Adjust quality as needed (0-1)
            };
            const compressedImage = await ImageCompressor.compress(imageUri, options);
            return compressedImage.uri;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null; // Handle errors appropriately
        }
    };

    const compressAudio = async (recordings) => {
        try {
            const compressedRecordings = await Promise.all(
                recordings.map(async (recording) => {
                    const compressedAudio = await AudioCompressor.compress(recording.file);
                    return {
                        ...recording,
                        sound: compressedAudio.sound, // Update sound object with compressed audio
                        file: compressedAudio.uri, // Update file URI with compressed audio
                    };
                })
            );
            setRecordings(compressedRecordings);
        } catch (error) {
            console.error('Error compressing audio:', error);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.uploadZone} onPress={openActionSheet}>
                <Feather name="upload" size={45} color={Colors.ORANGE} />
                <Text style={styles.uploadText}>Upload your files here</Text>
                <Text style={styles.browseText}>Browse</Text>
            </TouchableOpacity>
            <View style={styles.previewZone}>
                {selectedImage && (
                    <ImageViewer
                        placeholderImageSource={<Feather name="image" size={24} color="black" />}
                        selectedImage={selectedImage}
                    />
                )}
                {recording && (
                    <TouchableOpacity style={styles.startRecordingButton} onPress={stopRecording}>
                        <Text style={styles.startRecordingButtonText}>Stop Recording</Text>
                    </TouchableOpacity>
                )}
                {!selectedImage && !recording && !compressingAudio && !recordingStopped && (
                    <Text style={[styles.uploadText, { textAlign: 'center', fontSize: 14 }]}>No media selected</Text>
                )}
                {(selectedImage || recording || recordingStopped) && !compressingAudio && (
                    <View style={styles.recordingPlayerContainer}>
                        {getRecordingLines()}
                        <TouchableOpacity style={styles.compressButton} onPress={handleCompressNow}>
                            <Text style={styles.compressButtonText}>Compress Now</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {compressingAudio && !selectedImage && !recording && (
                    <TouchableOpacity style={styles.startRecordingButton} onPress={startRecording}>
                        <Text style={styles.startRecordingButtonText}>Start Recording</Text>
                    </TouchableOpacity>
                )}
            </View>
            <ActionSheet ref={actionSheetRef} gestureEnabled={true}>
                <TouchableOpacity style={styles.actionSheetItem} onPress={pickImageAsync}>
                    <Ionicons name="images" size={24} color={Colors.ORANGE} />
                    <Text style={styles.actionSheetItemText}>Compress Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionSheetItem} onPress={handleAudioUpload}>
                    <FontAwesome name="microphone" size={24} color={Colors.ORANGE} />
                    <Text style={styles.actionSheetItemText}>Compress Audio</Text>
                </TouchableOpacity>
            </ActionSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.WHITE,
    },
    image: {
        borderRadius: wp('3%'),
        aspectRatio: 16 / 9,
    },
    previewZone: {
        width: wp('90%'),
        height: 'auto',
        alignSelf: 'center',
        backgroundColor: Colors.PRIMARY,
        elevation: wp('3%'),
        marginVertical: hp('1.5%'),
        borderRadius: wp('5%'),
        paddingVertical: hp('2%'),
        paddingHorizontal: wp('3%'),
        justifyContent: 'space-between'
    },
    compressButtonText: {
        fontFamily: Fonts.semibold,
        color: Colors.PRIMARY
    },
    compressButton: {
        backgroundColor: Colors.ORANGE,
        height: hp('5%'),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('3%'),
        borderRadius: wp('3%'),
        elevation: wp('2%'),
        alignSelf: 'center',
        marginTop: hp('2%')
    },
    startRecordingButton: {
        backgroundColor: Colors.ORANGE,
        height: hp('5%'),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('3%'),
        borderRadius: wp('3%'),
        elevation: wp('2%'),
        alignSelf: 'center',
    },
    startRecordingButtonText: {
        fontFamily: Fonts.semibold,
        color: Colors.PRIMARY
    },
    uploadZone: {
        width: wp('90%'),
        height: hp('20%'),
        alignSelf: 'center',
        backgroundColor: Colors.PRIMARY,
        elevation: wp('3%'),
        marginVertical: hp('1.5%'),
        borderRadius: wp('5%'),
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        fontFamily: Fonts.semibold,
        color: Colors.BLACK,
        fontSize: 11,
        marginTop: hp('1%')
    },
    browseText: {
        fontFamily: Fonts.bold,
        color: Colors.ORANGE,
        fontSize: 16,
        textDecorationLine: 'underline'
    },
    actionSheetItem: {
        width: '100%',
        paddingVertical: hp('2%'),
        paddingHorizontal: wp('8%'),
        borderBottomWidth: hp('0.1%'),
        borderBottomColor: Colors.BLACK,
        alignItems: 'center',
        flexDirection: 'row',
        gap: wp('5%')
    },
    actionSheetItemText: {
        fontFamily: Fonts.semibold,
        fontSize: 14,
        color: Colors.BLACK,
    },
    row: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: wp('80%')
    },
    fill: {
        flex: 1,
        margin: 15
    },
    playDeleteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp('2%')
    }
});

export default HomeScreen;
