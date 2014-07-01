while true
do
    UPDATE=$(date +"%l:%M:%S %p, %B %d, %Y")
    curl "http://207.251.86.229/nyc-links-cams/LinkSpeedQuery.txt" | csvcut --tabs -c "Speed","EncodedPolyLine" > speeds.csv
    echo $UPDATE > asof.txt
    git add -A .
    git commit --amend -m "$UPDATE"
    git push -f origin master
    sleep 30
done
