import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { FFmpegKit } from 'ffmpeg-kit-react-native';
import LottieView from 'lottie-react-native';
import React, { useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import LoadingAnimation from '../../assets/lottie/Loading.json';
import { Colors } from '../constants/Colors';
import Fonts from '../constants/Fonts';

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

    const getRandomFileName = (extension) => {
        return `${Math.random().toString(36).substring(2, 15)}_${Date.now()}_compressed_${selectedType}_${compressionMethod}.${extension}`;
    };

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
            alertOptions['Huffman Coding'] = async () => {
                await setCompressionAndHandle('huffmanCoding');
            };

            alertOptions['Entropy Coding'] = async () => {
                await setCompressionAndHandle('entropyCoding');
            };
        } else if (selectedType === 'video') {
            alertOptions['Entropy Coding'] = async () => {
                await setCompressionAndHandle('entropyCoding');
            };

            alertOptions['RLE'] = async () => {
                await setCompressionAndHandle('RLE');
            };
        } else if (selectedType === 'image') {
            alertOptions['Entropy Coding'] = async () => {
                await setCompressionAndHandle('entropyCoding');
            };

            alertOptions['RLE'] = async () => {
                await setCompressionAndHandle('RLE');
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
                if (compressionMethod === 'entropyCoding') {
                    compressedUri = await compressImageEntropyCoding(selectedImage);
                } else if (compressionMethod === 'RLE') {
                    compressedUri = await compressImageRLE(selectedImage);
                }
            } else if (selectedType === 'video' && selectedVideo) {
                if (compressionMethod === 'entropyCoding') {
                    compressedUri = await compressVideoEntropyCoding(selectedVideo);
                } else if (compressionMethod === 'RLE') {
                    compressedUri = await compressVideoRLE(selectedVideo);
                }
            } else if (selectedType === 'audio' && selectedAudio) {
                if (compressionMethod === 'huffmanCoding') {
                    await compressAudioHuffmanCoding([{ file: selectedAudio }]);
                } else if (compressionMethod === 'entropyCoding') {
                    await compressAudioEntropyCoding([{ file: selectedAudio }]);
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

    const compressVideoEntropyCoding = async (videoUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('mkv')}`;
            const command = `-i ${videoUri} -c:v ffv1 -level 3 ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(videoUri, { idempotent: true });
            return outputUri;
        } catch (error) {
            console.error('Error compressing video:', error);
            return null;
        }
    };


    const compressVideoRLE = async (videoUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('avi')}`;
            const command = `-i ${videoUri} -vcodec bmp ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(videoUri, { idempotent: true });
            return outputUri;
        } catch (error) {
            console.error('Error compressing video:', error);
            return null;
        }
    };


    const compressImageEntropyCoding = async (imageUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('png')}`;
            const command = `-i ${imageUri} -compression_level 100 ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(imageUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null;
        }
    };

    const compressImageRLE = async (imageUri) => {
        try {
            const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('jpg')}`;
            const command = `-i ${imageUri} -c bmp -compression rle ${outputUri}`;
            await FFmpegKit.execute(command);
            await FileSystem.deleteAsync(imageUri, { idempotent: true });  // Clean up original file
            return outputUri;
        } catch (error) {
            console.error('Error compressing image:', error);
            return null;
        }
    };

    const compressAudioHuffmanCoding = async (recordings) => {
        try {
            const promises = recordings.map(async (recording, index) => {
                const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('mp3')}`;
                const command = `-i ${recording.file} -c:a libmp3lame -q:a ${outputUri}`;
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

    const compressAudioEntropyCoding = async (recordings) => {
        try {
            const promises = recordings.map(async (recording, index) => {
                const outputUri = `${FileSystem.cacheDirectory}${getRandomFileName('flac')}`;
                const command = `-i ${recording.file} -c:a flac ${outputUri}`;
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
