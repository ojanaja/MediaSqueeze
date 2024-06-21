import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import React, { useRef, useState } from 'react';
import { Colors } from '../constants/Colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Feather } from '@expo/vector-icons';
import Fonts from '../constants/Fonts';
import ActionSheet from 'react-native-actions-sheet';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import { FFmpegKit, FFmpegKitConfig } from 'ffmpeg-kit-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import LottieView from 'lottie-react-native';
import LoadingAnimation from '../../assets/lottie/Loading.json';
import * as Permissions from 'expo-permissions';

const HomeScreen = () => {
    const actionSheetRef = useRef();
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [compressingAudio, setCompressingAudio] = useState(false);
    const [compressionMethod, setCompressionMethod] = useState(null);
    const [selectedType, setSelectedType] = useState('')
    const [isCompressing, setIsCompressing] = useState(false);

    console.info("Selected", selectedImage);

    function getDurationFormatted(milliseconds) {
        const minutes = milliseconds / 1000 / 60;
        const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
        return seconds < 10 ? `${Math.floor(minutes)}:0${seconds}` : `${Math.floor(minutes)}:${seconds}`
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
            setSelectedType('image');
            closeActionSheet();
        } else {
            alert('You did not select any image.');
            closeActionSheet();
        }
    };

    const pickVideoAsync = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedVideo(result.assets[0].uri);
            setSelectedType('video');
            closeActionSheet();
        } else {
            alert('You did not select any video.');
            closeActionSheet();
        }
    };

    const pickAudioAsync = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
        });

        if (result.type === 'success') {
            setSelectedAudio(result.uri);
            setRecordings([...recordings, { uri: result.uri, name: result.name }]);
            setSelectedType('audio');
            closeActionSheet();
        } else {
            alert('You did not select any audio.');
            closeActionSheet();
        }
    };

    const chooseCompressionMethod = () => {
        const alertOptions = {
            Cancel: () => { },
        };

        if (selectedType === 'audio') {
            alertOptions['LAME MP3'] = async () => {
                await setCompressionAndHandle('lameMp3');
            };

            alertOptions['AAC'] = async () => {
                await setCompressionAndHandle('aac');
            };
        } else if (selectedType === 'video') {
            alertOptions['FFMPEG'] = async () => {
                await setCompressionAndHandle('h264');
            };

            alertOptions['DCT'] = async () => {
                await setCompressionAndHandle('h265');
            };
        } else if (selectedType === 'image') {
            alertOptions['FFMPEG'] = async () => {
                await setCompressionAndHandle('scalePad');
            };

            alertOptions['DCT'] = async () => {
                await setCompressionAndHandle('scalePad640');
            };
        }

        Alert.alert(
            'Choose Compression Method',
            'Select a compression method',
            Object.keys(alertOptions).map(text => ({ text, onPress: alertOptions[text] })),
            { cancelable: true }
        );
    };

    const setCompressionAndHandle = async (method) => {
        setCompressionMethod(method);

        await new Promise(resolve => setTimeout(resolve, 0));

        if (!compressionMethod) {
            Alert.alert('Error', 'Compression method not set. Please choose again.', [
                { text: 'OK' }
            ]);
        } else {
            await handleCompressNow(selectedType);
        }
    };


    function ImageViewer({ placeholderImageSource, selectedImage }) {
        const imageSource = selectedImage ? { uri: selectedImage } : placeholderImageSource;

        return <Image source={imageSource} style={styles.image} />;
    }

    const handleCompressNow = async (selectedType) => {
        let compressedUri = null;

        console.log('MediaType: ', selectedType);
        console.log('Compression Method: ', compressionMethod);

        setIsCompressing(true);

        try {
            if (selectedType === 'image' && selectedImage) {
                if (compressionMethod === 'scalePad') {
                    compressedUri = await compressImageScalePad(selectedImage);
                } else if (compressionMethod === 'scalePad640') {
                    compressedUri = await compressImageScalePad640(selectedImage);
                }
            } else if (selectedType === 'video' && selectedVideo) {
                if (compressionMethod === 'h264') {
                    compressedUri = await compressVideoH264(selectedVideo);
                } else if (compressionMethod === 'h265') {
                    compressedUri = await compressVideoH265(selectedVideo);
                }
            } else if (selectedType === 'audio' && selectedAudio) {
                if (compressionMethod === 'lameMp3') {
                    await compressAudioMp3([{ file: selectedAudio }]);
                } else if (compressionMethod === 'aac') {
                    await compressAudioAac([{ file: selectedAudio }]);
                }
                return;
            }

            if (compressedUri) {
                const { status } = await MediaLibrary.getPermissionsAsync();
                if (status !== 'granted') {
                    const { status: requestStatus } = await MediaLibrary.requestPermissionsAsync();
                    if (requestStatus !== 'granted') {
                        console.error('Media Library permission not granted!');
                        return;
                    }
                }
                await saveToGallery(compressedUri);
            }
        } catch (error) {
            setIsCompressing(false);
            Alert.alert('Error', `Error during compression: ${error.message}`);
            console.error('Error during compression:', error);
        }
    };

    const saveToGallery = async (uri) => {
        const { status } = await MediaLibrary.requestPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'You need to allow access to the media library to save the video.');
            return;
        }

        try {
            await MediaLibrary.createAssetAsync(uri);
            Alert.alert('Success', 'Media saved to gallery');
        } catch (error) {
            Alert.alert('Error', 'Error saving media to gallery');
            console.error('Error saving media to gallery:', error);
        } finally {
            setIsCompressing(false);
        }
    };

    const compressVideoH264 = async (videoUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}compressed_video.mp4`;
            const command = `-i ${videoUri} -vcodec h264 -preset ultrafast -crf 28 -tune zerolatency ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(videoUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing video:', error);
            return null;
        }
    };

    const compressVideoH265 = async (videoUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}compressed_video.mp4`;
            const command = `-i ${videoUri} -vcodec hevc -preset ultrafast -crf 28 -tune zerolatency ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(videoUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing video:', error);
            return null;
        }
    };

    const compressImageScalePad = async (imageUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}compressed_image.jpg`;
            const command = `-i ${imageUri} -vf "scale='if(gt(iw,ih),-1,iw):if(gt(ih,iw),-1,ih)',pad=ih:ih:(ow-iw)/2:(oh-ih)/2" ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(imageUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null;
        }
    };

    const compressImageScalePad640 = async (imageUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}compressed_image.jpg`;
            const command = `-i ${imageUri} -vf "scale='if(gte(iw/ih,1),640,-1)':'if(gte(ih/iw,1),640,-1)',pad=640:640:(ow-iw)/2:(oh-ih)/2" ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(imageUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null;
        }
    };

    const compressAudioMp3 = async (recordings) => {
        try {
            const promises = recordings.map(async (recording, index) => {
                const outputUri = `${FileSystem.cacheDirectory}compressed_audio.mp3`;
                const command = `-i ${recording.file} -c:a libmp3lame -q:a 2 ${outputUri}`;
                await FFmpegKit.execute(command);
                return {
                    ...recording,
                    file: outputUri,
                };
            });
            const compressedRecordings = await Promise.all(promises);
            setRecordings(compressedRecordings);
        } catch (error) {
            console.error('Error compressing audio:', error);
        }
    };

    const compressAudioAac = async (recordings) => {
        try {
            const promises = recordings.map(async (recording, index) => {
                const outputUri = `${FileSystem.cacheDirectory}compressed_audio.aac`;
                const command = `-i ${recording.file} -c:a aac -b:a 192k ${outputUri}`;
                await FFmpegKit.execute(command);
                return {
                    ...recording,
                    file: outputUri,
                };
            });
            const compressedRecordings = await Promise.all(promises);
            setRecordings(compressedRecordings);
        } catch (error) {
            console.error('Error compressing audio:', error);
        }
    };

    const playAudio = async (uri) => {
        try {
            const { sound } = await Audio.Sound.createAsync({ uri });
            await sound.playAsync();
        } catch (error) {
            console.error('Error playing audio:', error);
        }
    };

    const deleteAudio = (index) => {
        const updatedRecordings = recordings.filter((_, i) => i !== index);
        setRecordings(updatedRecordings);
    };

    const getRecordingLines = () => {
        return recordings.map((recording, index) => (
            <View key={index} style={styles.row}>
                <Text style={styles.uploadText}>
                    {recording.name || `Recording #${index + 1}`}
                </Text>
                <View style={styles.playDeleteContainer}>
                    <TouchableOpacity style={styles.compressButton} onPress={() => playAudio(recording.uri)}>
                        <Text style={styles.compressButtonText}>Play</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.compressButton} onPress={() => deleteAudio(index)}>
                        <Text style={styles.compressButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        ));
    };

    const resetState = () => {
        setSelectedImage(null);
        setSelectedAudio(null);
        setSelectedVideo(null);
        setRecordings([]);
        setCompressingAudio(false);
        setCompressionMethod(null);
        setSelectedType('');
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
                {selectedVideo && (
                    <Video
                        source={{ uri: selectedVideo }}
                        style={styles.mediaPreview}
                        useNativeControls
                        resizeMode="contain"
                        isLooping
                    />
                )}
                {selectedAudio && (
                    <View style={styles.audioPreviewContainer}>
                        {recordings.map((recording, index) => (
                            <View key={index} style={styles.audioPreview}>
                                <Text style={styles.audioPreviewText}>{recording.name}</Text>
                            </View>
                        ))}
                    </View>
                )}
                {!selectedImage && !selectedAudio && !selectedVideo && recordings.length === 0 && (
                    <Text style={[styles.uploadText, { textAlign: 'center', fontSize: 14 }]}>No media selected</Text>
                )}
                {(selectedImage || selectedAudio || selectedVideo || recordings.length > 0) && !compressingAudio && (
                    isCompressing ? (
                        <View style={styles.actionButtonsContainerCompressing}>
                            <LottieView
                                source={LoadingAnimation}
                                autoPlay
                                loop
                                style={styles.lottieAnimations}
                            />
                            <Text style={styles.uploadText}>Compressing Media...</Text>
                        </View>
                    ) : (
                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity style={styles.compressButton} onPress={chooseCompressionMethod}>
                                <Text style={styles.compressButtonText}>Compress Now</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={resetState} style={styles.refreshButton}>
                                <FontAwesome name="refresh" size={40} color={Colors.ORANGE} />
                            </TouchableOpacity>
                        </View>
                    )
                )}
                {getRecordingLines()}
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
                <TouchableOpacity style={styles.actionSheetItem} onPress={pickAudioAsync}>
                    <FontAwesome name="microphone" size={24} color={Colors.ORANGE} />
                    <Text style={styles.actionSheetItemText}>Compress Audio</Text>
                </TouchableOpacity>
            </ActionSheet>
        </View>
    );
};

const styles = StyleSheet.create({
    lottieAnimations: {
        width: wp('100%'),
        height: hp('10%'),
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: hp('2%')
    },
    actionButtonsContainerCompressing: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    mediaPreviewContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: hp('2%'),
    },
    mediaPreview: {
        width: wp('85%'),
        height: hp('40%'),
        alignSelf: 'center',
    },
    audioPreviewContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioPreview: {
        width: wp('80%'),
        padding: hp('1%'),
        backgroundColor: Colors.SECONDARY,
        marginBottom: hp('1%'),
        borderRadius: 10,
    },
    audioPreviewText: {
        color: Colors.WHITE,
        fontSize: hp('2%'),
        fontFamily: Fonts.regular,
    },
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
