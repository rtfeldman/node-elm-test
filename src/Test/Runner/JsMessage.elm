module Test.Runner.JsMessage exposing (JsMessage(..), decoder)

import Json.Decode as Decode exposing (Decoder)
import Test.Reporter.TestResults exposing (TestResult, unsafeTestResultDecoder)


type JsMessage
    = Begin
    | Test Int
    | Summary Float (List TestResult)


decoder : Decoder JsMessage
decoder =
    Decode.field "type" Decode.string
        |> Decode.andThen decodeMessageFromType


decodeMessageFromType : String -> Decoder JsMessage
decodeMessageFromType messageType =
    case messageType of
        "TEST" ->
            Decode.field "index" Decode.int
                |> Decode.map Test

        "BEGIN" ->
            Decode.succeed Begin

        "SUMMARY" ->
            Decode.map2 Summary
                (Decode.field "duration" Decode.float)
                (Decode.field "testResults" (Decode.list unsafeTestResultDecoder))

        _ ->
            Decode.fail ("Unrecognized message type: " ++ messageType)
