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
import * as MediaLibrary from 'expo-media-library';

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

    const pickVideoAsync = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
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
            const compressedImageUri = await compressImage(selectedImage);
            if (compressedImageUri) {
                console.log('Compressed Image URI:', compressedImageUri);
                const { status } = await MediaLibrary.getPermissionsAsync();
                if (status !== 'granted') {
                    const { status: requestStatus } = await MediaLibrary.requestPermissionsAsync();
                    if (requestStatus !== 'granted') {
                        console.error('Media Library permission not granted!');
                        return;
                    }
                }
                await saveToGallery(compressedImageUri);
            }
        } else if (recordings.length > 0) {
            await compressAudio(recordings);
            setCompressingAudio(false);
            console.log('Audio compressed successfully!');
            await saveRecordingsToGallery(recordings);
        } else {
            console.log('No media selected for compression');
        }
    };

    const saveRecordingsToGallery = async (recordings) => {
        try {
            const { status } = await MediaLibrary.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: requestStatus } = await MediaLibrary.requestPermissionsAsync();
                if (requestStatus !== 'granted') {
                    console.error('Media Library permission not granted!');
                    return;
                }
            }

            await Promise.all(recordings.map(async (recording, index) => {
                const asset = await MediaLibrary.createAssetAsync(recording.file, `Recording_${index + 1}.mp3`);
                await MediaLibrary.createAlbumAsync('Recordings', asset, false);
                Alert.alert('Success', `Recording ${index + 1} saved to files successfully!`);
            }));
        } catch (error) {
            Alert.alert('Error', 'Error saving recordings to files');
            console.error('Error saving recordings to files:', error);
        }
    };

    const saveToGallery = async (uri) => {
        try {
            const asset = await MediaLibrary.createAssetAsync(uri);
            await MediaLibrary.createAlbumAsync('Compressed', asset, false);
            Alert.alert('Success', 'Image saved to gallery successfully!');
        } catch (error) {
            Alert.alert('Error', 'Error saving image to gallery');
            console.error('Error saving image to gallery:', error);
        }
    };

    const compressImage = async (imageUri) => {
        console.log("Image URI on compress image", imageUri);
        try {
            const options = {
                quality: 0.8,
            };
            const compressedImage = await ImageCompressor.compress(imageUri, options);
            console.log('Image compressed successfully!');
            console.log("Image Compressed URI", compressedImage);
            return compressedImage;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null;
        }
    };


    const compressAudio = async (recordings) => {
        try {
            const compressedRecordings = await Promise.all(
                recordings.map(async (recording) => {
                    const compressedAudio = await AudioCompressor.compress(recording.file);
                    return {
                        ...recording,
                        sound: compressedAudio.sound,
                        file: compressedAudio.uri,
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
                <TouchableOpacity style={styles.actionSheetItem} onPress={pickVideoAsync}>
                    <Ionicons name="videocam" size={24} color={Colors.ORANGE} />
                    <Text style={styles.actionSheetItemText}>Compress Video</Text>
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
