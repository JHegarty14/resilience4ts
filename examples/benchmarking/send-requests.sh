url="http://localhost:3000"

# Function to send requests at random intervals
send_requests() {
  while true; do
    curl -s -o /dev/null -w "%{http_code}" $url &
    sleep $(( ( RANDOM % 5 )  + 1 ))
  done
}