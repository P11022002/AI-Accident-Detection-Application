import cv2
from ultralytics import YOLO

# 1. Load the model (yolov8n is the "nano" version - very fast)
model = YOLO('yolov8n.pt') 

# 2. Open the video source (0 for webcam, or "path/to/video.mp4")
cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, frame = cap.read()

    if success:
        # 3. Run YOLO inference on the frame
        # 'conf=0.5' means only show objects it's 50% sure about
        results = model(frame, conf=0.5)

        # 4. Visualize the results on the frame
        annotated_frame = results[0].plot()

        # 5. Display the resulting frame
        cv2.imshow("YOLOv8 Accident Detection Feed", annotated_frame)

        # Break the loop if 'q' is pressed
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    else:
        break

cap.release()
cv2.destroyAllWindows()