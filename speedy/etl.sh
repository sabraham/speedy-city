while true
do
    UPDATE=$(date +"%l:%M:%S %p, %B %d, %Y")
    curl "http://207.251.86.229/nyc-links-cams/LinkSpeedQuery.txt" | csvcut --tabs -c "Speed","EncodedPolyLine" > speeds.csv
    echo $UPDATE > asof.txt
    git add -A .
    git commit -m "$UPDATE"
    git push origin master
    sleep 30
done
