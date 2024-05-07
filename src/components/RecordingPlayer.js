import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const RecordingPlayer = ({ recordingURI }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [positionMillis, setPositionMillis] = useState(0);
    const [durationMillis, setDurationMillis] = useState(0);

    const playbackObject = useRef(new Audio.Sound());

    const loadRecording = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync({ uri: recordingURI });
            setSound(sound);

            sound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded) {
                    setDurationMillis(status.durationMillis);
                    setPositionMillis(status.positionMillis);
                    if (status.didJustFinish && !status.isLooping) {
                        setIsPlaying(false);
                    }
                }
            });
        } catch (error) {
            console.log('Error loading recording:', error);
        }
    };

    const playPause = async () => {
        if (!sound) {
            await loadRecording();
        }

        if (isPlaying) {
            await sound.pauseAsync();
        } else {
            await sound.playAsync();
        }

        setIsPlaying(!isPlaying);
    };

    const onSliderValueChange = value => {
        if (sound) {
            sound.setPositionAsync(value);
            setPositionMillis(value);
        }
    };

    return (
        <View>
            <TouchableOpacity onPress={playPause}>
                <FontAwesome name={isPlaying ? 'pause' : 'play'} size={24} />
            </TouchableOpacity>
            <Slider
                style={{ width: 200, height: 40 }}
                minimumValue={0}
                maximumValue={durationMillis}
                value={positionMillis}
                onValueChange={onSliderValueChange}
                minimumTrackTintColor="#000000"
                maximumTrackTintColor="#000000"
            />
        </View>
    );
};

export default RecordingPlayer;
