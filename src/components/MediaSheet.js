import React from "react";
import ActionSheet, {
    SheetManager,
    SheetProps,
    registerSheet,
} from "react-native-actions-sheet";

function MediaSheet(props) {
    return (
        <ActionSheet id={props.sheetId}>
            <View>
                <Text>Hello World</Text>
            </View>
        </ActionSheet>
    );
}

registerSheet("MediaSheet", MediaSheet);

export default MediaSheet;